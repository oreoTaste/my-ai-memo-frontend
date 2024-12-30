import { useState } from 'react';
import { useForm, FieldValues, FieldError } from 'react-hook-form';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';  // useNavigate 훅을 추가
import { useDarkMode } from '../DarkModeContext';
import  secureLocalStorage  from  "react-secure-storage";
import DarkButton from '../components/DarkButton';

export const LoggedOutRouter = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<FieldValues>();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();  // useNavigate 훅을 사용하여 navigate 함수 생성
  const { isDarkMode } = useDarkMode(); // 다크모드 상태 변수
    
  const onSubmit = async (data: any) => {
    const { loginId, password } = data;
    const url = `/user/login`;

    setIsLoading(true); // 요청 시작 시 로딩 시작
    try {
      const response = await axios.post(url
        , {loginId, password}
        , {withCredentials: true /* 쿠키를 포함시켜 요청을 보냄 */}
      );

      // 로그인 성공 시 로그인된 화면으로 이동
      if (response.data && response.data.result && response.data.user) {
        secureLocalStorage.setItem("user", JSON.stringify(response.data.user));
        // 로그인 성공 시 LoggedInRouter로 리디렉션
        navigate('/user/memos');  // 로그인 성공 후 리디렉션 할 경로 설정
      } else {
        alert('로그인 정보가 잘못되었습니다. 다시 시도해 주세요.');
      }
    } catch (error) {
      console.error('로그인 요청 중 에러 발생:', error);
      alert('로그인 실패. 다시 시도해 주세요.');
    } finally {
      setIsLoading(false); // 요청 완료 후 로딩 끝
    }
  };

  // 에러 메시지를 안전하게 출력하는 헬퍼 함수
  const getErrorMessage = (error: FieldError | undefined): string | null => {
    if (error && typeof error.message === 'string') {
      return error.message; // 메시지가 존재하면 반환
    }
    return null; // 없으면 null 반환
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-800'}`}>
      {/* 다크 모드 버튼 */}
      <DarkButton />

      <h1 className={`text-4xl font-semibold mb-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-800'}`}>로그인</h1>
      
      <form className={`p-8 rounded-lg shadow-lg max-w-md w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'}`}
        onSubmit={handleSubmit(onSubmit)} // form 제출 시 onSubmit 호출
      >
        <div className="mb-4">
          <input
            {...register('loginId', {
              required: '아이디를 입력해주세요' ,
              pattern: {
                value: /^(admin|[a-zA-Z0-9_]{5,20})$/, // 아이디는 5~20자 영문자, 숫자, 밑줄만 허용
                message: '아이디는 5~20자의 영문자, 숫자, 밑줄만 사용할 수 있습니다',
              }})}
            type="text"
            placeholder="아이디"
            className={`w-full p-3 border rounded-md text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 
              ${isDarkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-800 border-gray-300'} 
              ${errors.id ? 'border-red-500' : ''
            }`}
          />
          {errors.id && (
            <span className="text-red-500 text-sm">
              {getErrorMessage(errors.id as FieldError)}
            </span>
          )}
        </div>

        <div className="mb-6">
          <input
            {...register('password', {
              required: '비밀번호를 입력해주세요',
              minLength: { value: 6, message: '비밀번호는 최소 6자 이상이어야 합니다' }
            })}
            type="password"
            placeholder="비밀번호"
            className={`w-full p-3 border rounded-md text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 
              ${isDarkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-800 border-gray-300'} 
              ${errors.password ? 'border-red-500' : ''}`}
          />
          {errors.password && (
            <span className="text-red-500 text-sm">
              {getErrorMessage(errors.password as FieldError)}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 ${isLoading ? 'bg-gray-400' : 'bg-blue-500'} text-white text-lg font-semibold rounded-md hover:bg-blue-600 focus:outline-none`}
        >
          {isLoading ? '로그인 중...' : '로그인'}
        </button>
      </form>
      <button
        onClick={() => navigate('/register')}
        className="mt-4 text-blue-500 hover:underline"
      >
        회원가입
      </button>

    </div>
  );
};
