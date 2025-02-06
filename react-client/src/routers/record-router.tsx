import { useState, useEffect } from "react";
import axios from "axios";
import { useDarkMode } from "../DarkModeContext";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import Navbar from "../components/Navbar";
import DarkButton from "../components/DarkButton";
import secureLocalStorage from "react-secure-storage";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface User {
  id: string;
  loginId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
}

interface Record {
  seq: number;
  recordAType: string;
  recordBType: string;
  recordCType: string;
  count: number;
  value: string;
  createdAt: Date;
  modifiedAt: Date;
}

interface Code {
  code: string;
  codeDesc: string;
  codeGroup: string;
  createdAt: Date;
  modifiedAt: Date;
  remark: string;
  useYn: string;
}

const emptyRecord = {
  recordAType: "",
  recordBType: "",
  recordCType: "",
  count: 0,
  value: "",
  createdAt: new Date(), // 사용x
  modifiedAt: new Date(), // 사용x
  seq: 0, // 사용x
};

const groupDataByCategoryAndTime = (
  records: Record[],
  granularity: "date" | "hour" = "date",
  aCodelist: Code[] | null,
  bCodelist: Code[] | null
): {
  [recordAType: string]: { [recordBType: string]: { [key: string]: number } };
} => {
  const groupedData: {
    [recordATypeName: string]: {
      [recordBTypeName: string]: { [key: string]: number };
    };
  } = {};

  records.forEach((record: Record) => {
    // 시간 추출 (날짜 혹은 시간)
    const date = record.createdAt;
    const timeLabel =
      granularity === "date"
        ? date?.toLocaleDateString() // 날짜
        : `${date?.toLocaleDateString()} ${String(date?.getHours()).padStart(
            2,
            "0"
          )}시`; // 시간:분

    const recordATypeName = aCodelist?.find(
      (item) => item.code === record.recordAType
    )?.codeDesc as string;
    const recordBTypeName = bCodelist?.find(
      (item) => item.code === record.recordBType
    )?.codeDesc as string;

    if (!groupedData[recordATypeName]) {
      groupedData[recordATypeName] = {};
    }
    if (!groupedData[recordATypeName][recordBTypeName]) {
      groupedData[recordATypeName][recordBTypeName] = {};
    }
    if (!groupedData[recordATypeName][recordBTypeName][timeLabel]) {
      groupedData[recordATypeName][recordBTypeName][timeLabel] = 0;
    }
    groupedData[recordATypeName][recordBTypeName][timeLabel] += record.count;
  });

  return groupedData;
};

const determineGranularity = (
  records: Record[]
): "date" | "hour" | undefined => {
  // 7일 간의 데이터가 있을 때 날짜로 그룹화, 데이터가 부족하면 시간으로 그룹화
  const dates = new Set(
    records.map((record) => new Date(record.createdAt).toLocaleDateString())
  );
  return dates.size >= 7 ? "date" : "hour"; // 예시: 데이터가 7일 이상 있으면 날짜별, 아니면 시간별로
};

const CategoryCharts = ({
  groupedData,
}: {
  groupedData: {
    [recordAType: string]: { [recordBType: string]: { [key: string]: number } };
  };
}) => {
  return (
    <div className="space-y-8">
      {Object.keys(groupedData).map((recordAType) => (
        <div key={recordAType}>
          <h2 className="text-xl font-bold mb-4">{recordAType}</h2>
          {Object.keys(groupedData[recordAType]).map((recordBType) => {
            const dataByTime = groupedData[recordAType][recordBType];
            const labels = Object.keys(dataByTime).sort();
            const values = labels.map((time) => dataByTime[time]);

            return (
              <div key={recordBType} className="mb-8">
                <h3 className="text-lg font-semibold mb-2">{recordBType}</h3>
                <Bar
                  data={{
                    labels,
                    datasets: [
                      {
                        label: `${recordAType} - ${recordBType}`,
                        backgroundColor: `hsl(${
                          Math.random() * 360
                        }, 70%, 50%)`,
                        data: values,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: "top" as const,
                      },
                      title: {
                        display: true,
                        text: `시간별/날짜별 추이 (${recordBType})`,
                      },
                    },
                  }}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export const RecordRouter = () => {
  const [user, setUser] = useState<User | null>(null);
  const [aCodelist, setACodelist] = useState<Code[] | null>(null);
  const [bCodelist, setBCodelist] = useState<Code[] | null>(null);
  const [cCodelist, setCCodelist] = useState<Code[] | null>(null);
  const [recordlist, setRecordlist] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [newRecord, setNewRecord] = useState<Record>(emptyRecord);
  const { isDarkMode } = useDarkMode();

  const [groupedData, setGroupedData] = useState<{
    [recordAType: string]: {
      [recordBType: string]: { [date: string]: number };
    };
  }>({});

  useEffect(() => {
    const storedUser = JSON.parse(String(secureLocalStorage.getItem("user"))) as User;
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  // 데이터 로드
  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        try {
          setIsLoading(true);

          // 데이터 로드
          const [
            codeResponseCC001,
            codeResponseCC002,
            codeResponseCC003,
            recordResponse,
          ] = await Promise.all([
            axios.get(`/code/code-list?codeGroup=CC001`, {
              withCredentials: true,
            }),
            axios.get(`/code/code-list?codeGroup=CC002`, {
              withCredentials: true,
            }),
            axios.get(`/code/code-list?codeGroup=CC003`, {
              withCredentials: true,
            }),
            axios.get("/record/list", { withCredentials: true }),
          ]);

          let records: Record[] = [];

          // 공통코드 데이터 처리
          const loadedACodes = codeResponseCC001.data.result
            ? codeResponseCC001.data.codes
            : [];
          const loadedBCodes = codeResponseCC002.data.result
            ? codeResponseCC002.data.codes
            : [];
          const loadedCCodes = codeResponseCC003.data.result
            ? codeResponseCC003.data.codes
            : [];

          setACodelist(loadedACodes);
          setBCodelist(loadedBCodes);
          setCCodelist(loadedCCodes);
          
          if (recordResponse.data.result) {
            records = recordResponse.data.records.map((record: Record) => ({
              ...record,
              createdAt: new Date(record.createdAt),
            }));
            setRecordlist(records);
          }

          // 데이터가 모두 로드된 후 그룹화
          if (
            loadedACodes.length > 0 &&
            loadedBCodes.length > 0 &&
            records.length > 0
          ) {
            const granularity = determineGranularity(records);
            const grouped = groupDataByCategoryAndTime(
              records,
              granularity,
              loadedACodes,
              loadedBCodes
            );
            setGroupedData(grouped);
          }
        } catch (error) {
          console.error("데이터 로드 중 오류:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();
    }
  }, [user]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setNewRecord({
      ...newRecord,
      [e.target.name]:
        e.target.name === "count" ? Number(e.target.value) : e.target.value,
    });
  };

  const handleAddRecord = async () => {
    try {
      let inputRecord = { ...newRecord, createdAt: new Date() };
      const response = await axios.post("/record/insert", inputRecord, {
        withCredentials: true,
      });

      if (response.data.result) {
        alert("기록이 성공적으로 추가되었습니다.");
        let newRecordlist = [inputRecord, ...recordlist];
        setRecordlist((prev) => newRecordlist);
        setNewRecord(emptyRecord);
        let granularity = determineGranularity(newRecordlist);
        let grouped = groupDataByCategoryAndTime(
          newRecordlist,
          granularity,
          aCodelist,
          bCodelist
        );
        setGroupedData(grouped);
      } else {
        alert("기록 추가에 실패했습니다.");
      }
    } catch (error) {
      console.error("기록 추가 중 오류 발생:", error);
      alert("오류가 발생했습니다.");
    }
  };

  if (isLoading) {
    return <div
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

      <div
        className={`${
          isDarkMode
            ? "bg-gray-800 text-white border-gray-600"
            : "bg-white text-gray-800 border-gray-300"
        } w-full max-w-4xl p-6 rounded-lg shadow-lg mb-8`}
      >
        {/* 대분류, 중분류, 소분류 */}
        <div className="flex gap-4 mb-4 w-full">
          <select
            name="recordAType"
            value={newRecord.recordAType}
            onChange={handleInputChange}
            className={`${
              isDarkMode
                ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
                : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
            } w-1/3 flex-grow p-2 border rounded`}
          >
            <option value="">대분류 선택</option>
            {aCodelist?.map((item) => (
              <option key={item.code} value={item.code}>
                {item.codeDesc}
              </option>
            ))}
          </select>

          <select
            name="recordBType"
            value={newRecord.recordBType}
            onChange={handleInputChange}
            className={`${
              isDarkMode
                ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
                : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
            } w-1/3 flex-grow p-2 border rounded`}
          >
            <option value="">중분류 선택</option>
            {bCodelist
              ?.filter((item) => {
                return newRecord.recordAType === item.remark;
              })
              .map((item) => (
                <option key={item.code} value={item.code}>
                  {item.codeDesc}
                </option>
              ))}
          </select>

          <select
            name="recordCType"
            value={newRecord.recordCType}
            onChange={handleInputChange}
            className={`${
              isDarkMode
                ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
                : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
            } w-1/3 flex-grow p-2 border rounded`}
          >
            <option value="">소분류 선택</option>
            {cCodelist
              ?.filter((item) => {
                return newRecord.recordBType === item.remark;
              })
              .map((item) => (
                <option key={item.code} value={item.code}>
                  {item.codeDesc}
                </option>
              ))}
          </select>
        </div>

        {/* 횟수 및 값 입력 */}
        <div className="flex gap-4 w-full">
          <input
            type="number"
            name="count"
            value={newRecord.count}
            onChange={handleInputChange}
            placeholder="수량"
            className={`${
              isDarkMode
                ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
                : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
            } w-1/2 flex-grow p-2 border rounded`}
          />
          <input
            type="text"
            name="value"
            value={newRecord.value}
            onChange={handleInputChange}
            placeholder="값"
            className={`${
              isDarkMode
                ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
                : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
            } w-1/2 flex-grow p-2 border rounded`}
          />
        </div>

        <button
          onClick={handleAddRecord}
          className={`${
            isDarkMode
              ? "bg-indigo-700 text-white hover:bg-indigo-900"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          } mt-4 px-4 py-2 rounded  transition`}
        >
          추가하기
        </button>
      </div>

      <div className="w-full max-w-4xl">
        {/* 기록 데이터 출력 */}
        <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold mb-4">기록 데이터</h1>
          <CategoryCharts groupedData={groupedData} />
        </div>

      </div>
    </div>
  );
};
