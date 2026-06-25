import type { FlowCategory } from "./classifyTaste";

export type SceneMode = FlowCategory;

export type SceneData = {
  image: string;
  subtitle: string;
  title: string;
};

export const sceneData: Record<SceneMode, SceneData> = {
  focus: {
    image: "/scenes/focus.png",
    title: "Focus",
    subtitle: "Deep work mode",
  },
  escape: {
    image: "/scenes/escape.png",
    title: "Escape",
    subtitle: "Night window mode",
  },
  chill: {
    image: "/scenes/chill.png",
    title: "Chill",
    subtitle: "Soft room mode",
  },
  energy: {
    image: "/scenes/energy.png",
    title: "Energy",
    subtitle: "Clean movement mode",
  },
  worship: {
    image: "/scenes/worship.png",
    title: "Worship",
    subtitle: "Reflective light mode",
  },
};
