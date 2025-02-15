import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { LoggedOutRouter } from './routers/logged-out-router';
import { MemoRouter } from './routers/memo-router';
import { RegisterRouter } from './routers/register-router';
import { UsersRouter } from './routers/users-router';
import { RecordRouter } from './routers/record-router';
import { CodelistRouter } from './routers/codelist-router';
import { TodoRouter } from './routers/todo-router';
import { QueryRouter } from './routers/query-router';

const App = () => {
  return (
    <Router>
      <Routes>
        {/* 메인화면 */}
        <Route path="/" element={<LoggedOutRouter />} />
        {/* 로그인 화면이 /user/login 경로로 매핑됨 */}
        <Route path="/user/memos" element={<MemoRouter />} />
        <Route path="/user/todos" element={<TodoRouter />} />
        <Route path="/user/records" element={<RecordRouter />} />
        <Route path="/users" element={<UsersRouter />}/>
        <Route path="/register" element={<RegisterRouter />} />
        <Route path="/codes" element={<CodelistRouter />} />
        <Route path="/queries" element={<QueryRouter />} />
      </Routes>
    </Router>
  );
};


export default App;