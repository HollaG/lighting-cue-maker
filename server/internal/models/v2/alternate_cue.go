package v2

// AlternateCue is a variant of a Cue. It takes its position from its parent cue.
type AlternateCue struct {
	Base

	CueId string `json:"cueId" gorm:"type:uuid;not null;index"`

	CueFields
}

func (AlternateCue) TableName() string { return "v2.alternate_cues" }
