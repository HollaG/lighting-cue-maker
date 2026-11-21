import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";

const EVENT_TOUR_STEPS = 12;

type TourState = {
  active: boolean;
  step: number;
};

export interface TourSlice {
  tour: {
    event: TourState;
  };
  setEventTourActive: (active: boolean, startFrom?: number) => void;
  setEventTourStep: (step: number) => void;
  advanceEventTour: () => void;
}

export const tourSlice: StateCreator<AppStore, [], [], TourSlice> = (set) => ({
  tour: {
    event: { active: false, step: 0 },
  },
  setEventTourActive: (active, startFrom) =>
    set((s) => ({ tour: { ...s.tour, event: { ...s.tour.event, active, step: startFrom ?? s.tour.event.step } } })),
  setEventTourStep: (step) => set((s) => ({ tour: { ...s.tour, event: { ...s.tour.event, step } } })),
  advanceEventTour: () =>
    set((s) => ({
      tour: { ...s.tour, event: { ...s.tour.event, step: Math.min(s.tour.event.step + 1, EVENT_TOUR_STEPS - 1) } },
    })),
});
