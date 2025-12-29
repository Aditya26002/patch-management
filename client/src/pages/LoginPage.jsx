import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authenticateUser } from "../data/credentials";
import BgImage from "../assets/login-bg.svg";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const user = authenticateUser(username, password);

    if (user) {
      localStorage.setItem("user", JSON.stringify(user));

      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/home");
      }
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div
      className="flex login-bg h-screen"
      style={{ backgroundImage: `url(${BgImage})` }}
    >
      <div className="flex flex-col justify-between items-center w-1/2 h-screen p-10">
        <img src="/src/assets/Infra_Logo_Black.png" alt="" className=" h-1/5" />
        <img
          src="/src/assets/login-side.svg"
          alt=""
          className="w-[80%] h-2/3"
        />
      </div>

      <div className="w-1/2 flex items-center justify-center p-8">
        <div
          className="w-[60%] max-h-2/4 xl:max-h-3/4 p-[5%] rounded-2xl shadow-2xl overflow-hidden flex flex-col justify-between"
          style={{ backgroundColor: "white", color: "black" }}
        >
          <div className="mb-[5%]">
            <h2 className="text-3xl font-bold mb-2">Welcome</h2>
            <p style={{ color: "gray" }}>Please login to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium mb-2"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition placeholder:text-sm"
                placeholder="Enter your username"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition placeholder:text-sm"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 shadow-lg hover:shadow-xl"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
