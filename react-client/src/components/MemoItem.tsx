/** 2025.04.17 #1 */
import React, { useState, useEffect } from "react";
import { useSwipeable } from "react-swipeable";
import { useUser } from "../contexts/UserContext";
import { MemoUser, Memo } from "../types/memo";
import axios from "axios";
import { MemoUserTag } from "./MemoUserTag";

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

  // 편집 모드에서 사용할 로컬 상태 - 수정됨: shareType 포함
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
    if (!localSearchLoginId.trim()) {
      setLocalSearchUserResults([]);
      return;
    }
    try {
      const response = await axios.get(`/user/search`, {
        params: { loginId: localSearchLoginId },
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

  // 로컬 사용자 선택 토글 함수 - 수정됨: shareType 추가
  const toggleUserSelectionLocally = (user: MemoUser, shareType: 'view' | 'edit') => {
    const currentSharedUsers = localEditContent.sharedUsers || [];
    const exists = currentSharedUsers.find((u) => u.id === user.id);
    const newSharedUsers = exists
      ? currentSharedUsers.map((u) => (u.id === user.id ? { ...u, shareType } : u))
      : [...currentSharedUsers, { ...user, shareType }];
    setLocalEditContent({ ...localEditContent, sharedUsers: newSharedUsers });
    setLocalSearchLoginId("");
    setLocalSearchUserResults([]);
  };

  // 로컬 상태 업데이트 함수
  const updateLocalEditContent = (newContent: Partial<Memo>) => {
    setLocalEditContent((prev) => ({ ...prev, ...newContent }));
  };

  const selectedUsers = localEditContent.sharedUsers;

  // 편집 버튼 표시 조건 - 수정됨: shareType 기반
  const isOwned = memo.insertUser?.id === storedUser?.id;
  const canEdit = isOwned || memo.sharedUsers?.some((u) => u.id === storedUser?.id && u.shareType === 'edit');

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

            {/* 공유 사용자 섹션 - 수정됨: shareType 선택 UI 추가 */}
            <div className={`p-4 rounded-md ${isDarkMode ? "bg-gray-700" : "bg-gray-100"} mb-6`}>
              <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                공유 사용자 수정
              </h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="로그인 ID"
                  value={localSearchLoginId}
                  onChange={(e) => setLocalSearchLoginId(e.target.value)}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 ${
                    isDarkMode ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-700" : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                  }`}
                />
                <button
                  onClick={searchUsersLocally}
                  className={`w-full py-2 rounded-md text-white font-medium transition-all duration-200 ${
                    isDarkMode ? "bg-indigo-700 hover:bg-indigo-800" : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  사용자 검색
                </button>
              </div>
              {localSearchUserResults.length > 0 && (
                <div
                  className={`relative mt-2 w-full max-h-[50vh] overflow-y-auto rounded-md shadow-lg transition-all duration-200 ${
                    isDarkMode ? "bg-gray-700 text-white" : "bg-white text-gray-800"
                  }`}
                >
                  {localSearchUserResults.map((user) => (
                    <div key={user.id} className="p-3 flex justify-between items-center">
                      <span>
                        {user.name} ({user.loginId})
                      </span>
                      <div className="flex items-center space-x-2">
                        <label>
                          <input
                            type="radio"
                            name={`shareType_${user.id}`}
                            value="view"
                            onChange={() => toggleUserSelectionLocally(user, 'view')}
                            checked={selectedUsers.some((u) => u.id === user.id && u.shareType === 'view')}
                          />
                          조회
                        </label>
                        <label>
                          <input
                            type="radio"
                            name={`shareType_${user.id}`}
                            value="edit"
                            onChange={() => toggleUserSelectionLocally(user, 'edit')}
                            checked={selectedUsers.some((u) => u.id === user.id && u.shareType === 'edit')}
                          />
                          수정
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedUsers.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <MemoUserTag name={user.name} loginId={user.loginId} isDarkMode={isDarkMode} canEdit={user.shareType === "edit"} 
                    additionalTag={<button
                                    onClick={() => setLocalEditContent({
                                      ...localEditContent,
                                      sharedUsers: selectedUsers.filter((u) => u.id !== user.id)
                                    })}
                                    className="ml-2 focus:outline-none"
                                    aria-label={`Remove ${user.name} from shared users`}
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
                                  </button>}/>
                  ))}
                </div>
              )}
            </div>
          </div>            
        ) : (
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-800"}`}>
            {/* 메모 제목 */}
            <h4 className={`mb-3 text-xl font-semibold flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
              [{memo.title}]
              {!isOwned && memo.insertUser && (
                <MemoUserTag name={memo.insertUser.name} loginId={memo.insertUser.loginId} isDarkMode={isDarkMode} canEdit={canEdit} additionalCss={`ml-auto`}/>
              )}
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
            {/* 메모 작성자인 경우, 공유 사용자 목록 표시 */}
            {isOwned && memo.sharedUsers && memo.sharedUsers.length > 0 && (
              <div className={`mt-4 p-4 rounded-md ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                <h5 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                  공유 회원
                </h5>
                <div className="flex flex-wrap gap-2">
                  {memo.sharedUsers.map((user) => (
                    <MemoUserTag name={user.name} loginId={user.loginId} isDarkMode={isDarkMode} canEdit={canEdit}/>
                  ))}
                </div>
              </div>
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
      {/* 버튼 표시 - 수정됨: canEdit 조건 적용 */}
      {(!isScreenNarrow || isSwiped) && (
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
              {canEdit && (
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
              {isOwned && isAnalyzableFile() && (
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