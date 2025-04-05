import { useState, useEffect } from "react";
import axios from "axios";
import { useDarkMode } from "../contexts/DarkModeContext";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import DarkButton from "../components/DarkButton";

// 사용자 데이터 타입 정의
interface User {
  id: number;
  loginId: string;
  name: string;
  isActive: boolean;
  adminYn: "Y" | "N";
  telegramId: string | null;
  createdAt: string;
  modifiedAt: string;
}

const UserProfile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    id: 0,
    loginId: "",
    name: "",
    telegramId: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoginIdAvailable, setIsLoginIdAvailable] = useState<boolean | null>(null);
  const [isLoginIdChanged, setIsLoginIdChanged] = useState(false); // 상태로 변경
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();

  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await axios.get("/user/profile", {
          headers: { "X-API-Request": "true" },
        });

        if (!response.data.result && response.data.statusCode === 400) {
          alert("접근 권한이 없습니다.");
          navigate("/");
          return;
        }

        const userData = response.data.user;
        setUser(userData);
        setFormData({
          id: userData.id,
          loginId: userData.loginId,
          name: userData.name,
          telegramId: userData.telegramId || "",
        });
      } catch (error) {
        console.error("사용자 정보 가져오기 실패:", error);
        alert("사용자 정보를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  // 입력값 변경 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (name === "loginId") {
      const changed = value !== user?.loginId;
      setIsLoginIdChanged(changed); // 아이디 변경 여부 상태 업데이트
      if (changed) {
        setIsLoginIdAvailable(null); // 중복 확인 상태 초기화
      }
    }
  };

  // 비밀번호 입력값 변경 핸들러
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 아이디 중복 확인
  const checkLoginIdAvailability = async () => {
    try {
      if(formData.loginId === user?.loginId) {
        setIsLoginIdAvailable(true);
        return;
      }
  
      const response = await axios.get(`/user/exist-loginid?loginId=${formData.loginId}`, {
        headers: { "X-API-Request": "true" },
      });
      const existYn = !response.data.result;
      setIsLoginIdAvailable(existYn);
      if (existYn) {
        alert("사용 가능한 아이디입니다.");
      } else {
        alert("이미 사용 중인 아이디입니다.");
      }
    } catch (error) {
      console.error("아이디 중복 확인 실패:", error);
      alert("아이디 확인 중 오류가 발생했습니다.");
      setIsLoginIdAvailable(false);
    }
  };

  // 비밀번호 유효성 검사
  const validatePassword = () => {
    if (passwordData.newPassword && passwordData.newPassword.length < 6) {
      alert("새 비밀번호는 6자 이상이어야 합니다.");
      return false;
    }
    if (passwordData.newPassword && passwordData.newPassword !== passwordData.confirmPassword) {
      alert("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
      return false;
    }
    return true;
  };

  // 사용자 정보 수정 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoginIdChanged && isLoginIdAvailable !== true) {
      alert("아이디 중복 확인을 완료해주세요.");
      return;
    }

    if (!validatePassword()) {
      return;
    }

    try {
      const submitData = {
        ...formData,
        ...(passwordData.currentPassword && passwordData.newPassword
          ? { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword }
          : {}),
      };

      const response = await axios.post("/user/profile", submitData, {
        headers: { "X-API-Request": "true" },
      });

      if (response.data.result) {
        setUser((prev) => ({
          ...prev!,
          ...formData,
          modifiedAt: new Date().toISOString(),
        }));
        setIsEditing(false);
        setIsLoginIdAvailable(null);
        setIsLoginIdChanged(false); // 제출 후 초기화
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        alert("프로필이 성공적으로 업데이트되었습니다.");
      }
    } catch (error) {
      console.error("프로필 업데이트 실패:", error);
      alert("프로필 업데이트에 실패했습니다.");
    }
  };

  if (isLoading) {
    return (
      <div
        className={`flex min-h-screen flex-col items-center pt-16 ${
          isDarkMode ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-800"
        }`}
      >
        <Navbar isDarkMode={isDarkMode} />
        <DarkButton />
        <div className="text-center py-4">로딩 중...</div>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-screen flex-col items-center pt-16 ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-800"
      }`}
    >
      <Navbar isDarkMode={isDarkMode} />
      <DarkButton />

      <div
        className={`w-full max-w-2xl p-6 rounded-lg shadow-lg mt-8 ${
          isDarkMode
            ? "bg-gray-800 border border-gray-600"
            : "bg-white border border-gray-300"
        }`}
      >
        <h2 className="text-2xl font-bold mb-6 text-center">내 프로필</h2>

        {!isEditing ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">아이디</p>
                <p className="font-medium">{user?.loginId}</p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition"
              >
                수정
              </button>
            </div>
            <div>
              <p className="text-sm text-gray-500">이름</p>
              <p className="font-medium">{user?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">활성 상태</p>
              <p className="font-medium">{user?.isActive ? "활성" : "비활성"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">관리자 여부</p>
              <p className="font-medium">{user?.adminYn === "Y" ? "예" : "아니오"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">텔레그램 ID</p>
              <p className="font-medium">{user?.telegramId || "미설정"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">가입일</p>
              <p className="font-medium">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "날짜 없음"}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input type="text" value={user?.id} name="id" className="hidden" />
              <label className="block text-sm text-gray-500 mb-1">아이디</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  name="loginId"
                  value={formData.loginId}
                  onChange={handleInputChange}
                  className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode
                      ? "bg-gray-800 text-white border-gray-600"
                      : "bg-white text-gray-800 border-gray-300"
                  } ${
                    isLoginIdChanged && isLoginIdAvailable === null
                      ? "border-yellow-500"
                      : isLoginIdAvailable === false
                      ? "border-red-500"
                      : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={checkLoginIdAvailability}
                  className={`py-2 px-4 rounded text-white transition whitespace-nowrap ${
                    isLoginIdChanged && isLoginIdAvailable === null
                      ? "bg-yellow-500 hover:bg-yellow-600"
                      : isLoginIdAvailable === true
                      ? "bg-green-500 hover:bg-green-600"
                      : isLoginIdAvailable === false
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-gray-500 hover:bg-gray-600"
                  }`}
                >
                  중복 확인
                </button>
              </div>
              {isLoginIdChanged && isLoginIdAvailable === null && (
                <p className="text-sm text-yellow-500 mt-1">아이디가 변경되었습니다. 중복 확인이 필요합니다.</p>
              )}
              {isLoginIdAvailable === true && (
                <p className="text-sm text-green-500 mt-1">사용 가능한 아이디입니다.</p>
              )}
              {isLoginIdAvailable === false && (
                <p className="text-sm text-red-500 mt-1">이미 사용 중인 아이디입니다.</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">이름</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode
                    ? "bg-gray-800 text-white border-gray-600"
                    : "bg-white text-gray-800 border-gray-300"
                }`}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">텔레그램 ID</label>
              <input
                type="text"
                name="telegramId"
                value={formData.telegramId || ""}
                onChange={handleInputChange}
                className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode
                    ? "bg-gray-800 text-white border-gray-600"
                    : "bg-white text-gray-800 border-gray-300"
                }`}
              />
            </div>
            <div>
              <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className={`hidden`}
              />
              <label className="block text-sm text-gray-500 mb-1">새 비밀번호</label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode
                    ? "bg-gray-800 text-white border-gray-600"
                    : "bg-white text-gray-800 border-gray-300"
                }`}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">새 비밀번호 확인</label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode
                    ? "bg-gray-800 text-white border-gray-600"
                    : "bg-white text-gray-800 border-gray-300"
                }`}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition"
              >
                취소
              </button>
              <button
                type="submit"
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition"
              >
                저장
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default UserProfile;