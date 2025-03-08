import axios from "axios";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import secureLocalStorage from "react-secure-storage";

type User = {
  adminYn: string;
  token: string;
};

type UserContextType = {
  user: User | null;
  isLoading: boolean;
};

const UserContext = createContext<UserContextType>({ user: null, isLoading: true });

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const validateSession = async () => {
    const rawUser = secureLocalStorage.getItem("user");
    let parsedUser: User | null = null;

    try {
      // 로컬 스토리지에서 사용자 데이터 파싱
      if (rawUser) {
        parsedUser = JSON.parse(String(rawUser)) as User;
      } else {
        throw new Error("No user data in storage");
      }
      
      // 세션 검증 API 호출
      const response = await axios.post(
        "/user/auth",
        {},
        { withCredentials: true, headers: { "X-API-Request": "true" } }
      );

      if (!response.data?.result) {
        throw new Error("Session invalid");
      }

      setUser(parsedUser); // 유효하면 user 상태 업데이트
    } catch (e) {
      console.error("Session validation failed:", e);
      secureLocalStorage.removeItem("user");
      setUser(null);
      alert(parsedUser ? "세션이 만료되었습니다." : "로그인이 필요합니다.");
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    validateSession(); // 초기 검증

    const interval = setInterval(() => {
      if (!isLoading) {
        validateSession(); // 로딩이 끝난 후에만 주기적 검증
      }
    }, 5 * 60 * 1000); // 5분마다 체크

    return () => clearInterval(interval); // eslint-disable-next-line
  }, [navigate]); // navigate만 의존성으로 사용 

  return (
    <UserContext.Provider value={{ user, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);