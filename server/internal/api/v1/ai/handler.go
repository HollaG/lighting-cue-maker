package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"lighting-cue-maker/server/internal/models"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
)

type GenerateCueRequest struct {
	Lyrics string `json:"lyrics"`

	Cue *models.Cue `json:"cue"`

	FixtureGroups []models.FixtureGroupConfiguration `json:"fixtureGroups"`
}

type JevRequest struct {
	Model     string                 `json:"model"`
	State     string                 `json:"state"`
	Questions map[string]JevQuestion `json:"questions"`
}

type JevQuestion struct {
	Type         string            `json:"type"`
	Instructions string            `json:"instructions"`
	Criteria     map[string]string `json:"criteria"`
}

func generateCue(c *gin.Context) {
	// Prepare Q1: What Fixture Groups to enable.

	var req GenerateCueRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", map[string]any{
			"request": req,
		})
		return
	}
	if req.Cue == nil {
		response.BadRequest(c, "Cue is required", nil)
		return
	}

	jevReq := JevRequest{
		Model:     "jev-latest",
		State:     "",
		Questions: map[string]JevQuestion{},
	}

	// The state is:
	//   1. Lyrics
	//   2. Hardcode question string
	//   3. Comments
	//   4. lighting groups

	jevReq.State = req.Lyrics + "\n\n" +
		"I have a cue, ID = " + req.Cue.Uuid + " marked in the lyrics above. How to read it: word{cueId=XXX} means that cue will be fired on that word, whereas if the {cueId=xxx} is on its own, then the cue will be fired not on a word."

	if req.Cue.Comments != "" {
		jevReq.State += "\n\n" + "My comments are: " + req.Cue.Comments + "\nPlease take them into consideration."
	}

	jevReq.State += "\n\n I have " + strconv.Itoa(len(req.FixtureGroups)) + " lighting fixture groups. They are: "
	for _, fg := range req.FixtureGroups {
		jevReq.State += "\n" + fg.Name + " (ID = " + fg.Uuid + ")" + " - " + fg.Description + ","
	}

	// Give Jev every non-empty combination of fixture groups.
	// Each criteria key is a JSON array of IDs; its value lists the group names and descriptions.
	criteria := make(map[string]string)
	var addChoices func(index int, ids, names []string)
	addChoices = func(index int, ids, names []string) {
		if index == len(req.FixtureGroups) {
			if len(ids) == 0 {
				return
			}
			key, _ := json.Marshal(ids)
			criteria[string(key)] = strings.Join(names, ", ")
			return
		}

		group := req.FixtureGroups[index]
		name := group.Name
		if group.Description != "" {
			name += " (" + group.Description + ")"
		}
		addChoices(index+1, append(ids, group.Uuid), append(names, name))
		addChoices(index+1, ids, names)
	}
	addChoices(0, []string{}, []string{})
	jevReq.Questions["fixtureGroups"] = JevQuestion{
		Type:         "choice",
		Instructions: "You are a professional lighting designer. Look at the lyrics, the position of the cue within the lyrics, and the comments. Consider the sentiment, the context, and the overall mood, and use your knowledge of what looks good on stage AND is appropiate to choose which lighting fixture groups you want to activate for this cue.",
		Criteria:     criteria,
	}

	jevResponse, err := pollJev(c.Request.Context(), jevReq)
	if err != nil {
		log.Printf("Jev request failed: %v", err)
		response.InternalError(c, "Failed to generate cue")
		return
	}
	response.OK(c, jevResponse)
}

func pollJev(ctx context.Context, request JevRequest) (json.RawMessage, error) {
	key := os.Getenv("KEY_JEV")
	if key == "" {
		return nil, fmt.Errorf("KEY_JEV is not set")
	}

	body, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("marshal Jev request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.typesafe.ai/v1/systemone", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create Jev request: %w", err)
	}
	httpReq.Header.Set("Authorization", "Bearer "+key)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	httpResp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("send Jev request: %w", err)
	}
	defer httpResp.Body.Close()

	responseBody, err := io.ReadAll(io.LimitReader(httpResp.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("read Jev response: %w", err)
	}
	log.Printf("Jev response (%s): %s", httpResp.Status, responseBody)
	if httpResp.StatusCode < 200 || httpResp.StatusCode >= 300 {
		return nil, fmt.Errorf("Jev returned %s", httpResp.Status)
	}
	if !json.Valid(responseBody) {
		return nil, fmt.Errorf("Jev returned invalid JSON")
	}
	return json.RawMessage(responseBody), nil
}
