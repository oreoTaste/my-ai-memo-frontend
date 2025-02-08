import { useState, useEffect } from "react";
import axios from "axios";
import { useDarkMode } from "../DarkModeContext";
import Navbar from "../components/Navbar";
import DarkButton from "../components/DarkButton";

// 사용자와 메모 데이터 타입 정의
interface User {
  id: string; // seq
  loginId: string; // 로그인아이디
  name: string; // 이름
  isActive: boolean; // 사용여부
  createdAt: string; // 생성연월일
}

export const UsersRouter = () => {
  const [userlist, setUserlist] = useState<User[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { isDarkMode } = useDarkMode();

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`/user/list`, {
          withCredentials: true,
        });

        if (response.data.result) {
          const sortedUsers = response.data.users.sort((a: User, b: User) => {
            return Number(b.id) - Number(a.id);
          });
          setUserlist(sortedUsers);
        } else {
          setUserlist([]);
        }
      } catch (err) {
        console.error("사용자 데이터를 가져오는 중 오류 발생:", err);
        setUserlist([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (isLoading) {
    return (
      <div
      className={`flex flex-col items-center pt-16 min-h-screen ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-800"
      }`}
      >
        {/* 상단 탭 */}
        <Navbar isDarkMode={isDarkMode} />
        {/* 다크 모드 버튼 */}
        <DarkButton />
        <div className="text-center py-4">로딩 중...</div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center pt-16 min-h-screen ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-800"
      }`}
    >
      {/* 상단 탭 */}
      <Navbar isDarkMode={isDarkMode} />
      {/* 다크 모드 버튼 */}
      <DarkButton />

      {/* 사용자 정보리스트 */}
      <div
        className={`${
          isDarkMode
            ? "bg-gray-800 text-white border-gray-600"
            : "bg-white text-gray-800 border-gray-300"
        } w-full max-w-4xl bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-8`}
      >
        {userlist?.length === 0 ? (
          <p className="text-lg text-gray-500 dark:text-gray-400">
            저장된 사용자가 없습니다.
          </p>
        ) : (
          <div className="space-y-4">
            {userlist?.map((user: User) => (
              <div
                key={user.id}
                className={`${
                  isDarkMode
                    ? "bg-gray-800 text-white border border-gray-600 hover:bg-gray-600"
                    : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                } border flex justify-between items-center p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow`}
              >
                <div>
                  <h3
                    className={`${
                      isDarkMode ? "text-white " : "text-gray-800"
                    } text-lg font-semibold`}
                  >
                    {user.name}
                  </h3>
                  <p
                    className={`${
                      isDarkMode ? "text-white " : "text-gray-800"
                    } text-sm`}
                  >
                    로그인 아이디: {user.loginId}
                  </p>
                  <p
                    className={`${
                      isDarkMode ? "text-white " : "text-gray-800"
                    } text-sm`}
                  >
                    생성일: {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span
                    className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                      user.isActive
                        ? "bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-300"
                        : "bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-300"
                    }`}
                  >
                    {user.isActive ? "활성" : "비활성"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
