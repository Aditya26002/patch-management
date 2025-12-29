// Mock user credentials for authentication
export const users = [
  {
    id: 1,
    username: "admin",
    password: "admin123",
    role: "admin",
    name: "Admin User",
  },
  {
    id: 2,
    username: "user",
    password: "user123",
    role: "user",
    name: "Regular User",
  },
];

export const authenticateUser = (username, password) => {
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (user) {
    // Return user without password
    const { password: _password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  return null;
};
