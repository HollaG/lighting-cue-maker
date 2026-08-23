import { Box, Button, Flex, Scroller } from "@mantine/core";
import type { Item } from "../../types/types";

export const ItemControls = ({
  items,
  currentItem,
  onSelectItem,
}: {
  items: Item[];
  currentItem: Item | null;
  onSelectItem: (item: Item) => void;
}) => {
  const isCurrentItem = (item: Item) => {
    if (!currentItem) return false;
    return item.id === currentItem.id;
  };
  return (
    <Flex style={{ width: "100%", gap: "1rem", flexDirection: "row" }}>
      {/* <Box style={{ flexShrink: 0, flexGrow: 0, width: "125px" }}>
        <Button leftSection={<IconCaretLeft width="1rem" />} variant="subtle" color="gray">
          Previous
        </Button>
      </Box> */}
      <Flex style={{ flex: "1 1 0", minWidth: 0, width: 0 }}>
        <Scroller style={{ width: "100%" }} styles={{ content: { minWidth: "100%" } }}>
          <Flex
            style={{
              flexGrow: 1,
              flexWrap: "nowrap",
              gap: "0.5rem",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {items.map((item, index) => (
              <Box key={index} style={{ flexShrink: 0, flexGrow: 0 }}>
                <Button
                  variant={isCurrentItem(item) ? "light" : "subtle"}
                  color={isCurrentItem(item) ? "lime" : "gray"}
                  onClick={() => onSelectItem(item)}
                >
                  {item.name}
                </Button>
              </Box>
            ))}
          </Flex>
        </Scroller>
      </Flex>
      {/* <Box style={{ flexShrink: 0, flexGrow: 0, width: "150px", display: "flex", justifyContent: "flex-end" }}>
        <Button leftSection={<IconCaretRight width="1rem" />} variant="subtle" color="gray">
          Next
        </Button>
      </Box> */}
    </Flex>
  );
};
