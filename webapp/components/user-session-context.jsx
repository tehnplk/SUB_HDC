"use client";

import { createContext, useContext } from "react";

const UserSessionContext = createContext({});

export function UserSessionProvider({ value, children }) {
  return <UserSessionContext.Provider value={value}>{children}</UserSessionContext.Provider>;
}

export function useUserSession() {
  return useContext(UserSessionContext);
}
