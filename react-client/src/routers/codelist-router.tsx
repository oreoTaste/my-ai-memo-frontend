import { useState, useEffect } from "react";
import axios from "axios";
import { useDarkMode } from "../DarkModeContext";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import DarkButton from "../components/DarkButton";

// 공통코드 데이터 타입 정의
interface CommonCode {
  codeGroup: string;
  code: string;
  codeDesc: string;
  useYn: boolean;
  remark: string;
  createdAt: Date;
}

interface CommonCodeGroup {
  codeGroup: string;
  codeDesc: string;
  createdAt: Date;
  insertId: number;
  modifiedAt: Date;
  updateId: number;
  useYn: string;
  codes: CommonCode[];
}

const createNewCode = (
  newCode: Partial<CommonCode>,
  codeGroup: string
): CommonCode => ({
  code: newCode.code || "",
  codeDesc: newCode.codeDesc || "",
  useYn: newCode.useYn ?? true, // undefined인 경우 기본값 true
  codeGroup: codeGroup,
  remark: newCode.remark || "", // 기본값 빈 문자열
  createdAt: newCode.createdAt || new Date(), // 기본값 현재 날짜
});

export const CodelistRouter = () => {
  const [commonCodeGroups, setCommonCodeGroups] = useState<CommonCodeGroup[]>(
    []
  );
  const [selectedGroup, setSelectedGroup] = useState<CommonCodeGroup>({
    codeGroup: "",
    codeDesc: "",
    createdAt: new Date(),
    insertId: 0,
    modifiedAt: new Date(),
    updateId: 0,
    useYn: "",
    codes: [],
  });
  const [newGroup, setNewGroup] = useState<Partial<CommonCodeGroup>>({
    codeGroup: "",
    codeDesc: "",
  });
  const [newCode, setNewCode] = useState<Partial<CommonCode>>({
    code: "",
    codeDesc: "",
    useYn: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"group" | "code">("group");
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCommonCodeGroups = async () => {
      try {
        let response = await axios.get("/code/codegroup-list");


        if(!response.data.result && response.data.statusCode === 400) {
          alert("허용되지 않은 메뉴입니다.");
          navigate('/user/memos');  // 로그인 성공 후 리디렉션 할 경로 설정
        }

        let rslt = response.data.codegroups || [];
        rslt.sort((a: CommonCodeGroup, b: CommonCodeGroup) =>
          a.codeGroup.localeCompare(b.codeGroup)
        );
        setCommonCodeGroups(rslt);
        setIsLoading(true);
        if (rslt.length > 0) {
          setSelectedGroup(rslt[0]); // 첫번째 그룹을 기본으로 선택
        }
      } catch (error) {
        console.error("공통코드 그룹을 가져오는 중 오류 발생:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommonCodeGroups();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedGroup.codeGroup) {
      const fetchCodes = async () => {
        try {
          const response = await axios.get(
            `/code/code-list?codeGroup=${selectedGroup.codeGroup}`
          );
          setSelectedGroup((prev) => ({
            ...prev,
            codes: response.data.codes || [],
          }));
        } catch (error) {
          console.error("공통코드 조회 중 오류 발생:", error);
        }
      };

      fetchCodes();
    }
  }, [selectedGroup.codeGroup]);

  const handleGroupSelect = (group: CommonCodeGroup) => {
    if (group.codeGroup !== selectedGroup.codeGroup) {
      setSelectedGroup(group);
    }
  };

  const handleSaveGroup = async () => {
    try {
      let rslt = await axios.post("/code/codegroup-insert", newGroup);
      if (rslt.data.result) {
        alert("성공");
      }
      setNewGroup({ codeGroup: "", codeDesc: "" });
      setIsModalOpen(false);

      // 그룹 목록 다시 로드
      const response = await axios.get("/code/codegroup-list");
      if (response.data.result) {
        let rslt = response.data.codegroups || [];
        rslt.sort((a: CommonCodeGroup, b: CommonCodeGroup) =>
          a.codeGroup.localeCompare(b.codeGroup)
        );
        setCommonCodeGroups(rslt);

        // 새 그룹이 추가되면 해당 그룹 선택
        let addedGroup =
          rslt.find(
            (group: CommonCode) => group.codeGroup === newGroup.codeGroup
          ) || rslt[0];
        setSelectedGroup({ ...addedGroup }); // 참조 변경
      }
    } catch (error) {
      console.error("공통코드 그룹 저장 중 오류 발생:", error);
    }
  };

  const handleSaveCode = async () => {
    try {
      if (selectedGroup) {
        let inputCode = { codeGroup: selectedGroup.codeGroup, ...newCode };
        let rslt = await axios.post(`/code/code-insert`, inputCode);
        if (rslt.data?.result) {
          alert("성공");
        }
        setNewCode({ code: "", codeDesc: "", useYn: true });
        setIsModalOpen(false);
        setSelectedGroup((prev) => ({
          ...prev, // 기존 그룹 상태 유지
          codes: [
            ...prev.codes,
            createNewCode(newCode, selectedGroup.codeGroup),
          ],
        }));
      }
    } catch (error) {
      console.error("공통코드 저장 중 오류 발생:", error);
    }
  };

  // 모달 닫기
  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleDeleteCode = async (code: string, type: "group" | "code") => {
    try {
      const isGroup = type === "group";
      const itemType = isGroup ? "그룹" : "코드";
      const askComment = `${itemType} [${code}]를 삭제하시겠습니까?`;
      const deleteApi = isGroup
        ? "/code/codegroup-delete"
        : "/code/code-delete";
      const successMessage = `${itemType} 삭제 성공`;
      const failureMessage = `${itemType} 삭제 실패`;

      if (selectedGroup && window.confirm(askComment)) {
        const response = await axios.post(deleteApi, {
          codeGroup: selectedGroup.codeGroup,
          code,
        });

        if (response.data?.result) {
          alert(successMessage);

          if (isGroup) {
            // 그룹 삭제 후 상태 업데이트
            setCommonCodeGroups((prev) =>
              prev.filter((group) => group.codeGroup !== code)
            );

            setSelectedGroup(commonCodeGroups[0]);
          } else {
            // 코드 삭제 후 상태 업데이트
            setSelectedGroup((prev) => ({
              ...prev,
              codes: prev.codes.filter((c) => c.code !== code),
            }));
          }
        } else {
          alert(failureMessage);
        }
      }
    } catch (error) {
      console.error(
        `${type === "group" ? "그룹" : "코드"} 삭제 중 오류 발생:`,
        error
      );
    }
  };

  if (isLoading) {
    return (
      <div
      className={`flex min-h-screen flex-col items-center pt-16 text-gray-800
        ${isDarkMode ? "bg-gray-900" : "bg-gray-200"}`}
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
      className={`flex min-h-screen flex-col items-center pt-16 text-gray-800
        ${isDarkMode ? "bg-gray-900" : "bg-gray-200"}`}
    >
      {/* 상단 탭 */}
      <Navbar isDarkMode={isDarkMode} />
      {/* 다크 모드 버튼 */}
      <DarkButton />

      <div
        className={`${
          isDarkMode
            ? "bg-gray-800 text-white border border-gray-600"
            : "bg-white text-gray-800 border border-gray-300"
        } flex w-full max-w-4xl p-4 rounded-lg shadow-lg mb-8 text-sm`}
      >
        {/* 좌측 패널: 공통코드 그룹 목록 */}
        <div className={`w-full sm:w-5/12 rounded-lg shadow-sm p-0`}>
          <h2 className="text-lg font-bold mb-4 text-center py-2 rounded shadow-md">
            공통코드 그룹
          </h2>
          <ul className="space-y-2">
            {commonCodeGroups?.map((group) => (
              <li
                key={group.codeGroup}
                className={`${
                  isDarkMode
                    ? "bg-gray-800 text-white border border-gray-600 hover:bg-gray-600"
                    : "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50"
                } p-4 rounded flex justify-between items-center shadow-sm transition-all duration-75
            ${
              selectedGroup?.codeGroup === group.codeGroup
                ? "bg-blue-500"
                : "bg-gray-100"
            }`}
                onClick={() => handleGroupSelect(group)}
              >
                <div>
                  <p className="font-bold">
                    [{group.codeGroup}] {group.codeDesc}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {/* <span
                    className={`px-2 py-1 text-sm rounded-full ${
                      group.useYn
                        ? "bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-300"
                        : "bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-300"
                    }`}
                  >
                    {group.useYn ? "활성" : "비활성"}
                  </span> */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // 클릭 이벤트 전파 방지
                      handleDeleteCode(group.codeGroup, "group");
                    }}
                    className="px-3 py-1 text-sm bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                  >
                    X
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button
            onClick={() => {
              setModalType("group");
              setIsModalOpen(true);
            }}
            className="mt-4 w-full bg-green-500 text-white py-2 rounded"
          >
            그룹 추가
          </button>
        </div>

        {/* 우측 패널: 공통코드 목록 */}
        <div className="w-full sm:w-7/12 pl-6">
          {" "}
          {/* 여기서 w-7/12 → w-full로 수정 */}
          {selectedGroup ? (
            <>
              <h2 className="text-lg font-bold mb-4">
                [{selectedGroup.codeGroup}] {selectedGroup.codeDesc}
              </h2>
              <ul className="space-y-2">
                {selectedGroup.codes?.map((code) => (
                  <li
                    key={code.code}
                    className={`${
                      isDarkMode
                        ? "bg-gray-800 text-white border border-gray-600 hover:bg-gray-600"
                        : "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50"
                    } p-4 rounded flex justify-between items-center shadow-sm transition-all`}
                  >
                    <div>
                      <p className="font-bold">
                        [{code.code}] {code.codeDesc}
                      </p>
                      <p className="text-sm">{code.remark}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* <span
                        className={`px-2 py-1 text-sm rounded-full ${
                          code.useYn
                            ? "bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-300"
                            : "bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-300"
                        }`}
                      >
                        {code.useYn ? "활성" : "비활성"}
                      </span> */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // 클릭 이벤트 전파 방지
                          handleDeleteCode(code.code, "code");
                        }}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                      >
                        X
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  setModalType("code");
                  setIsModalOpen(true);
                }}
                className="mt-4 w-full bg-green-500 text-white py-2 px-4 rounded"
              >
                코드 추가
              </button>
            </>
          ) : (
            <p className="text-gray-500">공통코드 그룹을 선택하세요.</p>
          )}
        </div>
      </div>

      {/* 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg w-full sm:w-3/4 md:w-2/3 lg:w-2/5 max-w-2xl">
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 text-xl text-gray-500"
            >
              ×
            </button>
            <h3 className="text-lg font-bold mb-4">
              {modalType === "group" ? "그룹 추가/수정" : "코드 추가/수정"}
            </h3>
            {modalType === "group" ? (
              <>
                <input
                  type="text"
                  placeholder="그룹 코드"
                  value={newGroup.codeGroup}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, codeGroup: e.target.value })
                  }
                  className="w-full p-2 border rounded mb-2"
                />
                <input
                  type="text"
                  placeholder="그룹 설명"
                  value={newGroup.codeDesc}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, codeDesc: e.target.value })
                  }
                  className="w-full p-2 border rounded mb-4"
                />
                <div className="flex justify-between">
                  <button
                    onClick={closeModal}
                    className="bg-gray-500 text-white py-2 px-4 rounded"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveGroup}
                    className={`${
                      isDarkMode
                        ? "bg-indigo-700 hover:bg-indigo-900"
                        : "bg-indigo-600 hover:bg-indigo-700"
                    }  text-white py-2 px-4 rounded`}
                  >
                    추가하기
                  </button>
                </div>
              </>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="코드"
                  value={newCode.code}
                  onChange={(e) =>
                    setNewCode({ ...newCode, code: e.target.value })
                  }
                  className="w-full p-2 border rounded mb-2"
                />
                <input
                  type="text"
                  placeholder="코드 설명"
                  value={newCode.codeDesc}
                  onChange={(e) =>
                    setNewCode({ ...newCode, codeDesc: e.target.value })
                  }
                  className="w-full p-2 border rounded mb-2"
                />
                <input
                  type="text"
                  placeholder="코드 비고"
                  value={newCode.remark}
                  onChange={(e) =>
                    setNewCode({ ...newCode, remark: e.target.value })
                  }
                  className="w-full p-2 border rounded mb-4"
                />
                <div className="flex justify-between">
                  <button
                    onClick={closeModal}
                    className="bg-gray-500 text-white py-2 px-4 rounded"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveCode}
                    className={`${
                      isDarkMode
                        ? "bg-indigo-700 hover:bg-indigo-900"
                        : "bg-indigo-600 hover:bg-indigo-700"
                    }  text-white py-2 px-4 rounded`}
                  >
                    추가하기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
