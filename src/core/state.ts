// The little state the experience has, as a pure reducer and a tiny store.
import type { Overrides } from './approvals.ts';

export type State = {
  readonly started: boolean;
  readonly openClaimId: string | null;
  readonly muted: boolean;
  readonly approvals: Overrides;
};

export type Action =
  | { readonly type: 'begin' }
  | { readonly type: 'openClaim'; readonly claimId: string }
  | { readonly type: 'closeClaim' }
  | { readonly type: 'toggleSound' }
  | { readonly type: 'setApprovals'; readonly approvals: Overrides };

export const initialState = (approvals: Overrides = {}): State => ({
  started: false,
  openClaimId: null,
  muted: false,
  approvals,
});

export const reduce = (state: State, action: Action): State => {
  switch (action.type) {
    case 'begin':
      return state.started ? state : { ...state, started: true };
    case 'openClaim':
      return !state.started || state.openClaimId === action.claimId ? state : { ...state, openClaimId: action.claimId };
    case 'closeClaim':
      return state.openClaimId === null ? state : { ...state, openClaimId: null };
    case 'toggleSound':
      return { ...state, muted: !state.muted };
    case 'setApprovals':
      return { ...state, approvals: action.approvals };
  }
};

export type Store = {
  readonly get: () => State;
  readonly dispatch: (action: Action) => void;
  readonly subscribe: (listener: (state: State, previous: State) => void) => void;
};

export const createStore = (initial: State): Store => {
  let state = initial;
  const listeners: ((state: State, previous: State) => void)[] = [];
  return {
    get: () => state,
    dispatch: (action) => {
      const previous = state;
      state = reduce(state, action);
      if (state !== previous) listeners.forEach((listener) => listener(state, previous));
    },
    subscribe: (listener) => listeners.push(listener),
  };
};
