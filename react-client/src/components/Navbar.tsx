import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import  secureLocalStorage  from  "react-secure-storage";

type User = {
    adminYn: string;
};

const Navbar = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const navigate = useNavigate();
  let storedUser = {} as User;

  useEffect(() => {
    const storedUser = JSON.parse(String(secureLocalStorage.getItem("user"))) as User;
    if (!storedUser) {
      alert("로그인이 필요합니다.");
      navigate('/');  // 로그인 성공 후 리디렉션 할 경로 설정
    }
  }, [navigate]);

  const tabs = [
    { label: "메모", path: "/user/memos" },
    { label: "할일", path: "/user/todos" },
    { label: "기록", path: "/user/records" },
    { label: "사용자", path: "/users" },
  ];

  if(storedUser?.adminYn === "Y") {
    tabs.push({ label: "공통코드", path: "/codes" });
  }

  return (
    <nav
      className={`flex items-center justify-center`}
    >
      {tabs.map((tab) => (
        <button
          key={tab.path}
          onClick={() => navigate(tab.path)}
          className={`relative px-6 py-3 text-sm font-medium transition-all duration-100 text-white ${
            window.location.pathname === tab.path
              ? isDarkMode
                ? "bg-blue-600"
                : "bg-blue-500"
              : isDarkMode
              ? "text-gray-400 hover:text-white"
              : "text-gray-600 hover:text-black"
          } rounded-t-md rounded-b-none mx-0`}
        >
          {tab.label}
          {window.location.pathname === tab.path && (
            <span
              className={`absolute -bottom-1 left-0 right-0 h-1 ${
                isDarkMode ? "bg-blue-500" : "bg-blue-600"
              }`}
            ></span>
          )}
        </button>
      ))}
    </nav>
  );
};

export default Navbar;
