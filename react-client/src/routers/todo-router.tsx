import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import axios from "axios";
import { useDarkMode } from "../DarkModeContext";
import Navbar from "../components/Navbar";
import DarkButton from "../components/DarkButton";
import "react-calendar/dist/Calendar.css";
import { Value } from "react-calendar/dist/cjs/shared/types";

interface Todo {
  seq: number;
  date: string;
  title: string;
  desc: string;
}

export const TodoRouter = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [editTodo, setEditTodo] = useState<Todo | null>(null); // 수정 중인 Todo
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [prevMonth, setPrevMonth] = useState<string>("");
  const [modalIsOpen, setModalIsOpen] = useState<boolean>(false);
  const [newTodoTitle, setNewTodoTitle] = useState<string>("");
  const [newTodoDescription, setNewTodoDescription] = useState<string>("");
  const { isDarkMode } = useDarkMode();

  useEffect(() => {
    const fetchTodos = async () => {
      try {
        let now = new Date();
        if(selectedDate !== null) {
          now = selectedDate;
        }
        let nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        let searchStart = getFullDate(new Date(now.getFullYear(), now.getMonth()-1, 25));
        let searchEnd = getFullDate(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 7));

        const response = await axios.get(
          `/todo/list?dateStart=${searchStart}&dateEnd=${searchEnd}`,
          { withCredentials: true }
        );

        if (response.data.result) {
          setTodos(response.data?.todo);
        }
      } catch (err) {
        console.error("할 일 조회 중 오류 발생:", err);
        alert("할 일 조회 중 오류가 발생했습니다.");
      }
    };
    // 년+월이 바뀔때만 fetch하기
    if(prevMonth !== `${selectedDate?.getFullYear()}${selectedDate?.getMonth()}`) {
      setPrevMonth(`${selectedDate?.getFullYear()}${selectedDate?.getMonth()}`);
      fetchTodos();
    }
  }, [selectedDate, prevMonth]);

  const getFullDate = (date: Date | null): string => {
    const targetDate = date || new Date();
  
    const year = targetDate.getFullYear();
    const month = (targetDate.getMonth() + 1).toString().padStart(2, '0'); // 월은 0부터 시작하므로 1을 더함
    const day = targetDate.getDate().toString().padStart(2, '0'); // 날짜 앞에 0을 추가
  
    return `${year}-${month}-${day}`;
  };
  
  // 모달 열기 및 닫기
  const openModal = (todo?: Todo) => {
    setSelectedDate(todo ? new Date(todo.date) : new Date());
    setEditTodo(todo || null); // 할 일 수정인지 새로 추가인지 결정
    setModalIsOpen(true);
  };

  // 날짜 선택 시 호출되는 함수
  const handleDateChange = (date: Value) => {
    if (date instanceof Date) {
      setSelectedDate(date); // 날짜가 Date인 경우만 상태 업데이트
    }
  };
  const closeModal = () => {
    setModalIsOpen(false);
    setNewTodoTitle("");
    setNewTodoDescription("");
  };

  // 기존 addTodo와 updateTodo 통합
  const saveTodo = async () => {
    if (!selectedDate || !(editTodo ? editTodo.title : newTodoTitle) || !(editTodo ? editTodo.desc : newTodoDescription)) {
      alert("모든 필드를 채워주세요.");
      return;
    }

    const todoData: Todo = {
      seq: editTodo?.seq || 0, // seq가 0이면 새로 추가
      date: getFullDate(selectedDate),
      title: editTodo ? editTodo.title : newTodoTitle,
      desc: editTodo ? editTodo.desc : newTodoDescription,
    };

    try {
      const endpoint = todoData.seq > 0 ? "/todo/update" : "/todo/insert"; // 수정인지 추가인지 결정
      const response = await axios.post(endpoint, todoData, { withCredentials: true });

      if (response.data.result) {
        setTodos((prev) => {
          if (todoData.seq > 0) {
            // 수정
            return prev.map((todo) => (todo.seq === todoData.seq ? todoData : todo));
          } else {
            // 추가
            return [...prev, { ...todoData, seq: response.data.insertResult.raw.seq }];
          }
        });

        alert(todoData.seq > 0 ? "할 일이 수정되었습니다." : "할 일이 추가되었습니다.");
        closeModal();
      } else {
        alert("작업에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (err) {
      console.error("할 일 저장 중 오류 발생:", err);
      alert("작업 중 오류가 발생했습니다.");
    }
  };

  const deleteTodo = async (seq: number) => {
    if (!window.confirm("정말로 삭제하시겠습니까?")) return;

    try {
      const response = await axios.post(
        `/todo/delete`,
        { seq },
        { withCredentials: true }
      );
      if (response.data.result) {
        setTodos((prev) => prev.filter((todo) => todo.seq !== seq));
        alert("할 일이 삭제되었습니다.");
      } else {
        alert("할 일 삭제에 실패했습니다.");
      }
      closeModal();
    } catch (err) {
      console.error("할 일 삭제 중 오류 발생:", err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div
      className={`flex flex-col items-center pt-16 min-h-screen ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-800"
      }`}
    >
      {/* 상단 탭 */}
      <Navbar isDarkMode={isDarkMode} />
      <DarkButton />

      {/* 달력 컴포넌트 */}
      <div
        className={`${
          isDarkMode ? "dark-mode" : "light-mode"
        } w-full max-w-4xl rounded-lg shadow-lg mb-8`}
      >
        <Calendar
          onChange={handleDateChange}
          value={selectedDate}
          onActiveStartDateChange={({ activeStartDate }) => handleDateChange(activeStartDate)} // 월이 변경될 때마다 호출
          onClickDay={(date) =>
            openModal({
              date: getFullDate(date),
              title: "",
              desc: "",
              seq: 0,
            })
          }
          calendarType="gregory"
          tileClassName={({ date }) => {
            const isSelected =
              selectedDate?.toISOString() === date.toISOString();
            const modeClass = isDarkMode ? "dark-mode" : "light-mode";
            return isSelected
              ? `${modeClass} ${modeClass}--selected`
              : modeClass;
          }}
          className={`${
            isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
          } w-full h-[500px]`}
          tileContent={({ date }) => {
            const todosForDate = todos.filter(
              (todo) => todo.date === getFullDate(date)
            );
            return todosForDate.map((todo) => (
            <div key={todo.seq} className="flex items-center">
              <span className="cursor-pointer text-xs"
                onClick={(e) => {
                  e.stopPropagation(); // 클릭 이벤트 전파 방지
                  openModal(todo);
                }}
              >
                {todo.title}
              </span>
            </div>
            ));
          }}
        />
      </div>
      <style>{`
        .react-calendar__tile {
          height: 100px !important; /* 각 타일의 높이 */
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: flex-start;
          padding: 8px;
          border: 1px solid transparent; /* 기본 테두리 */
          border-radius: 4px; /* 모서리 둥글게 */
          cursor: default!important;
        }

        .react-calendar__tile.dark-mode {
          background-color: #1e293b; /* 어두운 배경 */
          color: #cbd5e1; /* 밝은 텍스트 */
          border: 1px solid #475569; /* 테두리 색 */
        }

        .react-calendar__tile.light-mode {
          background-color: #ffffff; /* 밝은 배경 */
          color: #1e293b; /* 어두운 텍스트 */
          border: 1px solid #d1d5db; /* 테두리 색 */
        }

        .react-calendar__tile:hover {
          background-color: var(--tile-hover-bg); /* 다크/라이트 모드 공통 */
          color: var(--tile-hover-color);
        }

        .react-calendar__tile:enabled:hover, .react-calendar__tile:enabled:focus, .react-calendar__navigation button:enabled:hover, .react-calendar__navigation button:enabled:focus {
          background-color: var(--tile-hover-bg); /* 다크/라이트 모드 공통 */
          color: var(--tile-hover-color);
        }

        .react-calendar__tile--selected {
          background-color: var(--tile-selected-bg); /* 선택된 날짜 */
          color: #ffffff; /* 선택된 날짜의 텍스트 */
          border: 1px solid var(--tile-selected-border); /* 테두리 강조 */
        }

        .react-calendar__tile--now {
          background-color: var(--tile-now-bg) !important; /* 오늘 날짜 */
        }
        .react-calendar__month-view__days__day--weekend {
          color: #d10000! important;
        }

        :root {
          /* 라이트 모드 변수 */
          --tile-hover-bg: #e2e8f0;
          --tile-hover-color: #1e293b;
          --tile-selected-bg: #2563eb;
          --tile-selected-border: #1d4ed8;
          --tile-now-bg: #c2c2c2;
        }

        .dark-mode {
          --tile-hover-bg: #334155;
          --tile-hover-color: #f1f5f9;
          --tile-selected-bg: #3b82f6;
          --tile-selected-border: #2563eb;
          --tile-now-bg: #3f567d;
        }
      `}</style>

      {/* 모달 컴포넌트 */}
      {modalIsOpen && (
        <div
          className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-80`}
        >
          <div
            className={`${
              isDarkMode
                ? "bg-gray-800 text-white border-gray-600"
                : "bg-white text-gray-800 border-gray-300"
            } p-6 rounded-lg shadow-lg max-w-lg mx-auto`}
          >
            <h2 className="text-xl font-semibold mb-4">할 일 추가</h2>
            <p className="text-sm mb-4">
              선택한 날짜: {getFullDate(selectedDate)}
            </p>

            <input
              type="text"
              placeholder="제목"
              value={editTodo ? editTodo.title : newTodoTitle}
              onChange={(e) =>
                editTodo
                  ? setEditTodo((prev) => prev && { ...prev, title: e.target.value })
                  : setNewTodoTitle(e.target.value)
              }
              className={`
                ${
                  isDarkMode
                    ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
                    : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                }
                w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
            />
            <textarea
              placeholder="설명"
              value={editTodo ? editTodo.desc : newTodoDescription}
              onChange={(e) =>
                editTodo
                  ? setEditTodo((prev) => prev && { ...prev, desc: e.target.value })
                  : setNewTodoDescription(e.target.value)
              }
              className={`
                ${
                  isDarkMode
                    ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
                    : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                }
                w-full p-2 h-24 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
            />

            <div className="flex justify-end space-x-4 mt-4">
              <button
                onClick={saveTodo}
                className={`${isDarkMode
                  ? "bg-indigo-700 hover:bg-indigo-900"
                  : "bg-indigo-600 hover:bg-indigo-700"
                  }
                  px-4 py-2 text-white rounded`}
              >
                {Number(editTodo?.seq) > 0 ? "수정하기" : "추가하기"}
              </button>
              {Number(editTodo?.seq) > 0 && (
                <button onClick={(e) => {
                    if(editTodo != null && editTodo.seq) {
                      e.stopPropagation(); // 클릭 이벤트 전파 방지
                      deleteTodo(editTodo.seq);
                    }
                  }}
                  className={`${isDarkMode
                    ? "bg-red-700 hover:bg-red-900"
                    : "bg-red-600 hover:bg-red-700"
                    }
                    px-4 py-2 text-white rounded`}
                  >
                  삭제
                </button>
              )}
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
