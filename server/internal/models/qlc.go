package models

type GenerateQlcCollectionsReq struct {
	MaxFunctionId               int               `json:"maxFunctionId"`
	AttributeValueToFunctionMap map[string]string `json:"attributeValueToFunctionMap"`
	LightEventId                string            `json:"lightEventId"`
}

type GenerateQlcCollectionsRes struct {
	MaxFunctionId               int               `json:"maxFunctionId"`
	AttributeValueToFunctionMap map[string]string `json:"attributeValueToFunctionMap"`
	LightEventId                string            `json:"lightEventId"`
}
