// One line of guidance at a time: how to start, then (once) how to travel.
export type Prompt = { readonly show: (text: string | null) => void };

export const mountPrompt = (host: HTMLElement): Prompt => ({
  show: (text) => {
    host.hidden = text === null;
    if (text !== null) host.textContent = text;
  },
});
