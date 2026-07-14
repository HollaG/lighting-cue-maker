## Gotchas when doing dynamic field adding with uncontrolled Mantine forms

If the forms are based off an index from a map, e.g.
`fixtureGroups.map((_, index) => ...)`

and the key is xxx\_${index}, then when removing an item from the array, e.g. removing index 1 in an length-3 array, the 3rd item (keyed xxx_2) will NOT be re-keyed to xxx_1.

When React lays out the form with the new length-2, even though you removed the index 1, it will actually remove index 2 instead as React will lay out index 0, find index 0's values in the form, and then lay out the new index 1 (which is the old index 2) and find index 1's values in the form (and NOT index 2).

#### SOlution

To combat this, we use Object keys and set an always-increasing key for each item. In this case, we use Date.now(). This ensures that even if we remove an item, the keys will remain unique and React will not re-key the items.
