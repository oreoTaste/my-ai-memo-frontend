/** 2025.04.11 #1 */
import React, { useState, useEffect } from "react"; // useEffect 추가
import { useSwipeable } from "react-swipeable";
import { useUser } from "../contexts/UserContext";
import { MemoUser, Memo } from "../types/memo";
import axios from "axios";

interface MemoItemProps {
  memo: Memo;
  isDarkMode: boolean;
  isEditing: boolean;
  isExpanded: boolean;
  memoHeights?: { raws: number; answer: number };
  index: number;
  isScreenNarrow: boolean;
  startEditing: (memo: Memo) => void;
  cancelMemo: (memoSeq: number) => void;
  updateMemo: (memoSeq: number, updatedContent: Partial<Memo>) => void;
  deleteMemo: (memoSeq: number) => void;
  toggleExpanded: (memoSeq: number) => void;
  textareaRefs: React.MutableRefObject<Map<string, HTMLTextAreaElement>>;
  editMemoContent?: {
    title: string;
    subject?: string;
    raws: string;
    answer: string;
    sharedUsers?: MemoUser[];
  };
  handleDownload: (memoSeq: number, fileName: string, googleDriveFileId?: string) => void;
  handleAnalyze: (memoSeq: number) => void;
}

export const MemoItem: React.FC<MemoItemProps> = ({
  memo,
  isDarkMode,
  isEditing,
  isExpanded,
  memoHeights,
  index,
  startEditing,
  cancelMemo,
  updateMemo,
  deleteMemo,
  toggleExpanded,
  textareaRefs,
  editMemoContent,
  isScreenNarrow,
  handleDownload,
  handleAnalyze,
}) => {
  const [isSwiped, setIsSwiped] = useState(false);
  const { user: storedUser } = useUser();

  // 편집 모드에서 사용할 로컬 상태
  const [localSearchName, setLocalSearchName] = useState("");
  const [localSearchLoginId, setLocalSearchLoginId] = useState("");
  const [localSearchUserResults, setLocalSearchUserResults] = useState<MemoUser[]>([]);
  const [localEditContent, setLocalEditContent] = useState({
    title: "",
    subject: "",
    raws: "",
    answer: "",
    sharedUsers: [] as MemoUser[],
  });

  // 수정 모드 시작 시 editMemoContent로 localEditContent 동기화
  useEffect(() => {
    if (isEditing && editMemoContent) {
      setLocalEditContent({
        title: editMemoContent.title || "",
        subject: editMemoContent.subject || "",
        raws: editMemoContent.raws || "",
        answer: editMemoContent.answer || "",
        sharedUsers: editMemoContent.sharedUsers || [],
      });
    }
  }, [isEditing, editMemoContent]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => isScreenNarrow && setIsSwiped(true),
    onSwipedRight: () => isScreenNarrow && setIsSwiped(false),
    preventScrollOnSwipe: true,
    trackTouch: true,
    trackMouse: true,
    delta: 50,
  });

  const imageRegExp = /\.(jpeg|jpg|png|jfif|gif|webp)$/i;
  const analyzableRegExp = /\.(jpeg|jpg|png|jfif|gif|webp|pdf)$/i;

  const isAnalyzableFile = (): boolean => {
    return !!memo.files && memo.files.some(({ fileName }) => analyzableRegExp.test(fileName));
  };

  // 로컬 사용자 검색 함수
  const searchUsersLocally = async () => {
    if (!localSearchName.trim() || !localSearchLoginId.trim()) {
      setLocalSearchUserResults([]);
      return;
    }
    try {
      const response = await axios.get(`/user/search`, {
        params: { name: localSearchName, loginId: localSearchLoginId },
        withCredentials: true,
        headers: { "X-API-Request": "true" },
      });
      if (response.data.result) {
        setLocalSearchUserResults(response.data.users || []);
      } else {
        setLocalSearchUserResults([]);
      }
    } catch (error) {
      console.error("사용자 검색 중 오류 발생:", error);
      setLocalSearchUserResults([]);
    }
  };

  // 로컬 사용자 선택 토글 함수
  const toggleUserSelectionLocally = (user: MemoUser) => {
    const currentSharedUsers = localEditContent.sharedUsers || [];
    const isSelected = currentSharedUsers.some((u) => u.id === user.id);
    const newSharedUsers = isSelected
      ? currentSharedUsers.filter((u) => u.id !== user.id)
      : [...currentSharedUsers, user];
    setLocalEditContent({ ...localEditContent, sharedUsers: newSharedUsers });
    setLocalSearchName("");
    setLocalSearchLoginId("");
    setLocalSearchUserResults([]);
  };

  // 로컬 상태 업데이트 함수
  const updateLocalEditContent = (newContent: Partial<Memo>) => {
    setLocalEditContent((prev) => ({ ...prev, ...newContent }));
  };

  const selectedUsers = localEditContent.sharedUsers;

  return (
    <div
      {...swipeHandlers}
      className={`relative overflow-hidden rounded-lg shadow-lg p-4 mb-4 transition duration-300 flex items-center justify-between ${
        isDarkMode ? "bg-gray-800 text-white border-gray-600" : "bg-white text-gray-800 border-gray-300"
      } ${isSwiped ? "translate-x-[-100px]" : "translate-x-0"}`}
    >
      <div className="flex-1 pr-4">
        {isEditing ? (
          <div>
            {/* 기본 입력 필드 */}
            <div className="mb-6">
              <input
                type="text"
                value={localEditContent.title}
                onChange={(e) => updateLocalEditContent({ title: e.target.value })}
                className={`w-full p-2 border rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 ${
                  isDarkMode ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600" : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                }`}
                placeholder="제목"
                style={{ height: "auto" }}
              />
              <input
                type="text"
                value={localEditContent.subject || ""}
                onChange={(e) => updateLocalEditContent({ subject: e.target.value })}
                className={`w-full p-2 border rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 ${
                  isDarkMode ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600" : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                }`}
                placeholder="주제"
                style={{ height: "auto" }}
              />
              <textarea
                value={localEditContent.raws}
                onChange={(e) => {
                  updateLocalEditContent({ raws: e.target.value });
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                className={`w-full p-2 border rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 ${
                  isDarkMode ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600" : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                }`}
                placeholder="내용"
                style={{ height: "auto" }}
              />
              <textarea
                value={localEditContent.answer}
                onChange={(e) => {
                  updateLocalEditContent({ answer: e.target.value });
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                className={`h-48 w-full p-2 border rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 ${
                  isDarkMode ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600" : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                }`}
                placeholder="응답"
                style={{ height: "auto" }}
              />
            </div>

            {/* 공유 사용자 섹션 */}
            <div className={`p-4 rounded-md ${isDarkMode ? "bg-gray-700" : "bg-gray-100"} mb-6`}>
              <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                공유 사용자 수정
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="이름"
                  value={localSearchName}
                  onChange={(e) => setLocalSearchName(e.target.value)}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 ${
                    isDarkMode ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-700" : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                  }`}
                />
                <input
                  type="text"
                  placeholder="로그인 ID"
                  value={localSearchLoginId}
                  onChange={(e) => setLocalSearchLoginId(e.target.value)}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 ${
                    isDarkMode ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-700" : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                  }`}
                />
              </div>
              <button
                onClick={searchUsersLocally}
                className={`mt-2 w-full py-2 rounded-md text-white font-medium transition-all duration-200 ${
                  isDarkMode ? "bg-indigo-700 hover:bg-indigo-800" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                사용자 검색
              </button>
              {localSearchUserResults.length > 0 && (
                <div
                  className={`relative mt-2 w-full max-h-[50vh] overflow-y-auto rounded-md shadow-lg transition-all duration-200 ${
                    isDarkMode ? "bg-gray-700 text-white" : "bg-white text-gray-800"
                  }`}
                  style={{ maxHeight: "50vh", top: "100%" }} // 화면 높이의 50%로 제한, 버튼 아래에 고정
                >
                  {localSearchUserResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => toggleUserSelectionLocally(user)}
                      className={`p-3 flex justify-between items-center cursor-pointer hover:${
                        isDarkMode ? "bg-gray-600" : "bg-gray-100"
                      } ${
                        selectedUsers.some((u) => u.id === user.id)
                          ? isDarkMode
                            ? "bg-indigo-600 text-white"
                            : "bg-indigo-100 text-indigo-800"
                          : ""
                      }`}
                    >
                      <span>
                        {user.name} ({user.loginId})
                      </span>
                      {selectedUsers.some((u) => u.id === user.id) && (
                        <span className="text-sm text-indigo-500">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {selectedUsers.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                        isDarkMode ? "bg-indigo-700 text-white" : "bg-indigo-100 text-indigo-800"
                      }`}
                    >
                      {user.name} ({user.loginId})
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleUserSelectionLocally(user);
                        }}
                        className="ml-2 focus:outline-none"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 text-red-500 hover:text-red-700"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>            
        ) : (
          // 읽기 모드 UI는 변경 없음
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-800"}`}>
            <h4 className={`mb-3 text-xl font-semibold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
              [{memo.title}]
              {memo.insertId !== storedUser?.id
              ? ` (shared by ${memo?.insertUser?.loginId})`
              : memo.sharedUsers?.length
              ? ` (shared to ${memo.sharedUsers.map((el) => el.loginId).join(", ")})`
              : null}
            </h4>
            {memo.subject && (
              <p className={`mb-2 text-sm font-medium ${isDarkMode ? "text-indigo-300" : "text-indigo-500"}`}>
                주제: {memo.subject}
              </p>
            )}
            <textarea
              readOnly
              ref={(el) => el && textareaRefs.current.set(`raws_${memo.seq}`, el)}
              className={`w-full mt-3 ${
                isDarkMode ? "bg-gray-800 text-white placeholder-gray-500" : "bg-gray-100 text-gray-800 placeholder-gray-500"
              } text-sm font-medium p-3 rounded-lg resize-none focus:outline-none`}
              style={{ height: memoHeights?.raws || "auto" }}
              value={`${memo.raws}`}
            />
            {memo.answer && (
              <textarea
                readOnly
                ref={(el) => el && textareaRefs.current.set(`answer_${memo.seq}`, el)}
                className={`w-full mt-3 ${
                  isDarkMode ? "bg-gray-800 text-white placeholder-gray-500" : "bg-gray-100 text-gray-800 placeholder-gray-500"
                } text-sm font-medium p-3 rounded-lg resize-none focus:outline-none`}
                style={{ height: memoHeights?.answer || "auto" }}
                value={`조언 : ${memo.answer}`}
              />
            )}
            {memo.files && memo.files.length > 0 && (
              <div className="mt-5">
                <h5 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-800"}`}>첨부 파일</h5>
                <div className="flex flex-wrap gap-4 mb-4">
                  {memo.files
                    .filter(({ fileName }) => imageRegExp.test(fileName))
                    .map(({ fileName, googleDriveFileId }, idx) => {
                      const imageSrc = googleDriveFileId
                        ? `https://drive.google.com/thumbnail?id=${googleDriveFileId}&sz=w144-h144`
                        : `/uploads/${memo.seq}/${fileName}`;
                      const imageLink = googleDriveFileId
                        ? `https://drive.google.com/file/d/${googleDriveFileId}/view?usp=drive_link`
                        : `/uploads/${memo.seq}/${fileName}`;
                      return (
                        <img
                          key={idx}
                          onClick={() => window.open(imageLink, "_blank")}
                          className="max-h-36 max-w-36 cursor-pointer rounded-lg border border-gray-300 hover:shadow-lg"
                          src={imageSrc}
                          alt={fileName}
                          loading="lazy"
                        />
                      );
                    })}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {memo.files
                    .filter(({ fileName }) => !imageRegExp.test(fileName))
                    .map(({ fileName, googleDriveFileId }, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleDownload(memo.seq, fileName, googleDriveFileId)}
                        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300"
                      >
                        <span className="truncate">{fileName}</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 ml-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l8 8m0 0l8-8m-8 8V4" />
                        </svg>
                      </button>
                    ))}
                </div>
              </div>
            )}
            <div className="mt-4 text-xs">
              <p className="text-gray-400 dark:text-gray-500">등록일시 : {new Date(memo.createdAt).toLocaleString()}</p>
              <p className="text-gray-400 dark:text-gray-500">수정일시 : {new Date(memo.modifiedAt).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
      { /* 수정 버튼 노출 조건 */
      (/* 조건 1. 화면이 넓거나 좌로 스와이프하지 않은 경우에만 */!isScreenNarrow || isSwiped) && 
      (
        <div className="relative top-0 right-0 h-full flex flex-col items-center justify-center space-y-4 p-2">
          {isEditing ? (
            <>
              <button
                onClick={() => updateMemo(memo.seq, localEditContent)}
                className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition"
                aria-label="저장"
              >
                ✓
              </button>
              <button
                onClick={() => cancelMemo(memo.seq)}
                className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                aria-label="취소"
              >
                ✕
              </button>
            </>
          ) : (
            <>
              {(/* 조건 1. 본인이 작성한 메모여야 함*/storedUser?.id === memo.insertUser?.id) && (
                <button
                  onClick={() => startEditing(memo)}
                  className="w-10 h-10 bg-yellow-500 text-white rounded-full flex items-center justify-center hover:bg-yellow-600 transition"
                  aria-label="수정"
                >
                  ✎
                </button>
              )}
              <button
                onClick={() => deleteMemo(memo.seq)}
                className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                aria-label="삭제"
              >
                ✕
              </button>

              {(/* 조건 1. 본인이 작성한 메모여야 함*/storedUser?.id === memo.insertUser?.id) && 
                isAnalyzableFile() && (
                <button
                  onClick={() => handleAnalyze(memo.seq)}
                  className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition"
                  aria-label="분석"
                >
                  📑
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};