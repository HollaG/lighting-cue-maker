import { createContext, useContext, useState } from "react";
import { AttributeTypes, type LightEventConfiguration } from "../types/types";

type FormState = Omit<LightEventConfiguration, "dbId" | "id">;

type CreateEventContextType = {
  form: FormState;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
};

const initialForm: FormState = {
  name: "",
  cuesPerBand: undefined,
  uniqueCuesPerBand: undefined,
  fixtureGroups: [],
};

const CreateEventContext = createContext<CreateEventContextType | null>(null);

export const CreateEventProvider = ({ children }: { children: React.ReactNode }) => {
  const [form, setForm] = useState<FormState>(initialForm);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addFixtureGroup = () => {
    setForm((prev) => ({ ...prev, fixtureGroups: [...prev.fixtureGroups, { id: crypto.randomUUID(), name: "", attributes: [] }] }));
  };

  /**
   * When adding a new attribute, we default to a select attribute.
   * This is the most common option.
   * 
   * @param fixtureGroupId 
   */
  const addAttribute = (fixtureGroupId: string) => {
    setForm((prev) => ({ ...prev, fixtureGroups: prev.fixtureGroups.map((fg) => fg.id === fixtureGroupId ? { ...fg, attributes: [...fg.attributes, { id: crypto.randomUUID(), name: "", type: AttributeTypes.SELECT, metadata: new Map(), optionPossibleValues: [] }] } : fg) }));
  };

  const modifyAttribute = (fixtureGroupId: string, attributeId: string,) => {
  };

  return (
    <CreateEventContext.Provider value={{ form, setField }}>
      {children}
    </CreateEventContext.Provider>
  );
};

export const useCreateEvent = () => {
  const ctx = useContext(CreateEventContext);
  if (!ctx) throw new Error("useCreateEvent must be used inside CreateEventProvider");
  return ctx;
};
