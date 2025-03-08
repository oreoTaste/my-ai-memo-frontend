// NotFound.tsx
import { useNavigate } from "react-router-dom";
import { useDarkMode } from "../contexts/DarkModeContext";

const NotFound = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode(); // 다크 모드 상태

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen ${
        isDarkMode ? "bg-gray-900" : "bg-gray-100"
      } text-center p-5 font-sans`}
    >
      <h1
        className={`text-8xl md:text-9xl font-bold ${
          isDarkMode ? "text-red-400" : "text-red-500"
        } mb-0`}
      >
        404
      </h1>
      <h2
        className={`text-3xl md:text-4xl ${
          isDarkMode ? "text-gray-200" : "text-gray-800"
        } mt-5 mb-6`}
      >
        페이지를 찾을 수 없습니다
      </h2>
      <p
        className={`text-lg md:text-xl ${
          isDarkMode ? "text-gray-400" : "text-gray-600"
        } max-w-xl mb-8`}
      >
        요청하신 페이지가 존재하지 않거나 잘못된 경로로 접근하셨습니다. URL을
        확인하거나 홈으로 돌아가세요.
      </p>
      <button
        onClick={() => navigate("/")}
        className={`px-6 py-3 text-white text-base md:text-lg rounded-md transition-colors duration-300 ${
          isDarkMode
            ? "bg-blue-600 hover:bg-blue-700"
            : "bg-blue-500 hover:bg-blue-600"
        }`}
      >
        홈으로 돌아가기
      </button>
    </div>
  );
};

export default NotFound;