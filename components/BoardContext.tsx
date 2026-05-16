"use client";

import { createContext, useContext } from "react";

interface BoardCtx {
  readOnly: boolean;
}

const Ctx = createContext<BoardCtx>({ readOnly: false });

export const BoardProvider = Ctx.Provider;

export function useReadOnly() {
  return useContext(Ctx).readOnly;
}
