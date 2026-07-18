import { createContext, useContext } from "react";
import { generateRich } from "../utils/convertText";
import type { Item, LightEventConfiguration } from "../types/types";
import type { Cue } from "../types/cues";
import { useEventState } from "../hooks/useEventState";
import { useItemState } from "../hooks/useItemState";
import { useLyricsState, type LyricMode } from "../hooks/useLyricsState";
import { useCueState } from "../hooks/useCueState";

// ─── Public context shape ────────────────────────────────────────────────────

type AppContextType = {
  // Event
  code: string | null;
  setCode: (code: string | null) => void;
  event: LightEventConfiguration | null;
  isValidEvent: boolean;

  // Items
  activeItem: Item | null;
  changeActiveItem: (item: Item | null) => void;
  items: Item[];
  itemName: string;
  setItemName: (name: string) => void;
  onAddItem: () => void;

  // Lyrics
  rawLyrics: string;
  setRawLyrics: (rawLyrics: string) => void;
  content: string[][];
  setContent: (content: string[][]) => void;
  lyricInputMode: LyricMode;
  setLyricInputMode: (mode: LyricMode) => void;
  onFinishAddingLyrics: () => void;
  onBeginAddingLyrics: () => void;

  // Cues
  onAddCue: (lineIndex: number, wordIndex: number, isSpace: boolean) => void;
  cueOrder: string[];
  cues: Cue[];
};

// ─── Context ─────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const event = useEventState();
  const item = useItemState(event.event?.id, event.isValidEvent);
  const lyrics = useLyricsState();
  const cues = useCueState(
    event.event?.id,
    item.activeItem?.id,
    event.isValidEvent,
    lyrics.content,
    lyrics.setContent,
    lyrics.setRawLyrics,
  );

  // ── Cross-cutting handlers ─────────────────────────────────────────────────

  /**
   * Switch the active item and immediately hydrate the lyrics editor
   * with that item's stored raw lyrics.
   */
  const changeActiveItem = (newItem: Item | null) => {
    item.setActiveItem(newItem);
    if (newItem) {
      lyrics.setRawLyrics(newItem.rawLyrics ?? "");
      lyrics.setContent(generateRich(newItem.rawLyrics ?? ""));
    } else {
      lyrics.setRawLyrics("");
      lyrics.setContent([]);
    }
  };

  /**
   * Create a new item, immediately activate it, then refresh the list.
   */
  const onAddItem = async () => {
    const res = await item.executeCreateItem({ name: item.itemName });
    if (res?.item) changeActiveItem(res.item);
    item.refetchItems();
    item.setItemName("");
  };

  /**
   * Commit the current raw lyrics to the database and switch to rich view.
   * Refreshes item state so the saved rawLyrics is reflected everywhere.
   */
  const onFinishAddingLyrics = () => {
    const richContent = generateRich(lyrics.rawLyrics);
    lyrics.setContent(richContent);
    lyrics.setLyricInputMode("rich");

    item.executeUpdateItem({ rawLyrics: lyrics.rawLyrics }).then((res) => {
      item.refetchItems();
      item.setActiveItem(res.item);
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppContext.Provider
      value={{
        // Event
        code: event.code,
        setCode: event.setCode,
        event: event.event,
        isValidEvent: event.isValidEvent,

        // Items
        activeItem: item.activeItem,
        changeActiveItem,
        items: item.items,
        itemName: item.itemName,
        setItemName: item.setItemName,
        onAddItem,

        // Lyrics
        rawLyrics: lyrics.rawLyrics,
        setRawLyrics: lyrics.setRawLyrics,
        content: lyrics.content,
        setContent: lyrics.setContent,
        lyricInputMode: lyrics.lyricInputMode,
        setLyricInputMode: lyrics.setLyricInputMode,
        onFinishAddingLyrics,
        onBeginAddingLyrics: lyrics.onBeginAddingLyrics,

        // Cues
        onAddCue: cues.onAddCue,
        cueOrder: cues.cueOrder,
        cues: cues.cues,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// ─── Consumer hook ────────────────────────────────────────────────────────────

/**
 * Hook to consume the global app context.
 * Must be used inside <AppProvider>.
 */
export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside AppProvider");
  return ctx;
}
