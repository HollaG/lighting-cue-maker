package qlc

import (
	"fmt"
	"lighting-cue-maker/server/internal/models"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"
	"strconv"

	"github.com/gin-gonic/gin"
)

// Return an array like this, each <Function.../Function> is one element.
// <Function ID="118" Type="Collection" Name="MD 28">
//
//	<Step Number="0">57</Step>
//	<Step Number="1">69</Step>
//	<Step Number="2">4</Step>
//	<Step Number="3">17</Step>
//	<Step Number="4">31</Step>
//	<Step Number="5">34</Step>
//	<Step Number="6">54</Step>
//	<Step Number="7">49</Step>
//	<Step Number="8">26</Step>
//	<Step Number="9">29</Step>
//	<Step Number="10">88</Step>
//	<Step Number="11">80</Step>
//
// </Function>
func generateCollectionXml(c *gin.Context) {
	var req models.GenerateQlcCollectionsReq
	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Println(err)
		response.BadRequest(c, "Invalid request body", map[string]any{
			"request": req,
		})
		return
	}

	fmt.Println("API POST /api/v1/qlc/generate-collections")

	// Get all items of this lightEventUuid, include all cues of the items
	var items []models.Item
	result := database.DB().
		Preload("Cues").
		Where("light_event_uuid = ?", req.LightEventId).
		Find(&items)
	if result.Error != nil {
		response.InternalError(c, "Failed to get items")
		return
	}

	var idCounter = req.MaxFunctionId + 1
	var outputStr string = ""
	for i := range items {
		item := items[i]

		for j := range item.Cues {
			// cue := item.Cues[j]
			collectionName := item.Name + convertNumberTo2DigitMinimumString(j+1)

			outputStr += `<Function ID="` + strconv.Itoa(idCounter) + `" Type="Collection" Name="` + collectionName + `">`

			outputStr += `</Function>\n`

		}

	}

	response.OK(c, req)

}

func convertNumberTo2DigitMinimumString(n int) string {
	if n < 10 {
		return "0" + strconv.Itoa(n)
	}
	return strconv.Itoa(n)
}

func getDataForXmlGeneration(c *gin.Context) {
	var lightEventId = c.Param("lightEventId")
	// Get all items of this lightEventUuid, include all cues of the items.
	// Only fetch items that have raw lyrics, and only preload cues that have assignments.
	var items []models.Item
	result := database.DB().
		Preload("Cues").
		Where("light_event_uuid = ?", lightEventId).
		Where("raw_lyrics != ''").
		Where("EXISTS (SELECT 1 FROM cues WHERE cues.item_uuid = items.uuid AND cues.deleted_at IS NULL)").
		Find(&items)
	if result.Error != nil {
		response.InternalError(c, "Failed to get items")
		return
	}

	// process the cue order of all items using raw_lyrics

	response.OK(c, map[string]any{
		"items": items,
	})
}
