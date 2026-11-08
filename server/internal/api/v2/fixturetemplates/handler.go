package fixturetemplates

import (
	modelsv2 "lighting-cue-maker/server/internal/models/v2"
	"lighting-cue-maker/server/pkg/database"
	"lighting-cue-maker/server/pkg/response"

	"github.com/gin-gonic/gin"
)

// getFixtureTemplates lists the global fixture library.
// raw_source (the original import file) is left out to keep the list small;
// the server copies templates into events itself, so the client never needs it.
func getFixtureTemplates(c *gin.Context) {
	templates := []modelsv2.FixtureTemplate{}
	if err := database.DB().
		Omit("RawSource").
		Order("manufacturer, name").
		Find(&templates).Error; err != nil {
		response.InternalError(c, "Failed to get fixture templates")
		return
	}

	response.OK(c, map[string]any{
		"fixtureTemplates": templates,
	})
}
