import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user] = useState(null);

  const login = () => {
    console.log("Login disabled");
  };

  const logout = () => {
    console.log("Logout disabled");
  };

  return (
    <AuthContext.Provider value={{ user, loading: false, login, logout, checkAuth: () => {} }}>
      {children}
    </AuthContext.Provider>
  );
};
