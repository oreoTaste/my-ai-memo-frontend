const express = require('express');
const axios = require('axios');
const cors = require('cors'); // CORS 설정
const path = require('path');
const session = require('express-session');
const app = express();
const multer = require("multer");
const port = process.env.PORT; // Express 서버가 실행되는 포트
const FormData = require('form-data');
const fs = require('fs');

require('dotenv').config();

app.use((req, res, next) => {
  req.setTimeout(0); // 시간 제한 없음
  res.setTimeout(0);
  next();
});

// 세션 미들웨어 설정
app.use(
  session({
    secret: 'my-secret',  // 세션 서명에 사용될 비밀 키
    resave: false,
    saveUninitialized: false,
    cookie: {
      // httpOnly: true,  // JavaScript에서 쿠키를 접근하지 못하게 설정
      // secure: false,  // 프로덕션 환경에서는 HTTPS를 사용
      // sameSite: 'Strict',  // CORS 요청에서 쿠키를 전송하려면 None으로 설정
      maxAge: 1000 * 60 * 60 * 24,  // 쿠키 유효 기간 (1일)
    },
  })
);

// CORS 설정
app.use(cors({
   origin: [
     process.env.LOCAL_APP_URL,   // React 앱의 URL -> proxy
     process.env.NEST_APP_API_URL  // NestJS 앱의 URL -> http://192.168.56.1:3000
   ],
  methods: ['GET','POST','PUT','DELETE'],  // 허용할 HTTP 메소드
  allowedHeaders: 'Content-Type, Accept, Authorization, Origin',  // 허용할 헤더
  credentials: true,  // 쿠키 포함 요청 허용
}));

// 미들웨어로 IP 체크
// app.set('trust proxy', true);
// const allowedIp = process.env.REACT_APP_API_URL.substring(process.env.REACT_APP_API_URL.indexOf("://") + 3);
// app.use((req, res, next) => {
//   let clientIp = req.ip; // 클라이언트의 ip

//   // IPv6 주소에 있는 ::ffff: 접두사 제거
//   if (clientIp.startsWith('::ffff:')) {
//       clientIp = clientIp.slice(7); // "::ffff:" 길이만큼 잘라낸다.
//   }
//   console.log('clientIp', clientIp, 'allowedIp', allowedIp);
  
//   // IP가 맞지 않으면 요청을 차단
//   if (clientIp !== allowedIp) {
//     return res.status(403).send('Access Forbidden');
//   }

//   // 조건이 맞으면 다음 미들웨어나 라우터로 넘기기
//   next();
// });

app.use(express.json({ limit: "1024mb" })); // JSON 요청 처리
app.use(express.urlencoded({ extended: true, limit: "1024mb" })); // URL-encoded 데이터 처리

const apiGeminiProxy = async (req, res) => {
  const targetUrl = `${process.env.REACT_APP_AI_URL}${process.env.REACT_APP_AI_KEY}`;
  try {
    console.log(targetUrl, req.method, req.body?.text);
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: { "Content-Type": "application/json" }, //req.headers,
      data: {
        "contents": [{
          "parts":[{"text": req.body?.text}]
          }]
         },
      withCredentials: true, // 쿠키를 포함한 요청
    });

    console.log(response.data?.candidates[0]?.content?.parts[0]?.text);

    // Set-Cookie 헤더를 클라이언트에 전달
    if (response.headers['set-cookie']) {
      res.set('Set-Cookie', response.headers['set-cookie']);
    }

    // 백엔드 응답을 클라이언트에 반환
    res.json(response.data);
  } catch (error) {
    // console.error('백엔드 서버 요청 실패:', error.response?.data);
    res.json({ message: '서버 오류가 발생했습니다. 나중에 다시 시도해주세요.' });
  }
}

const apiProxy = async (req, res) => {
  const targetUrl = `${process.env.NEST_APP_API_URL}${req.originalUrl}`;
  console.log(`${req.method} ${targetUrl} ${req.method}`);
  try {
    let data;
    let headers = { ...req.headers, 'Cache-Control': 'no-cache' };

    // multipart/form-data 요청인지 확인
    if (req.headers['content-type']?.startsWith('multipart/form-data')) {
      const form = new FormData();

      // 파일 추가
      if (req.files) {
        req.files.forEach(file => {
          form.append('files', fs.createReadStream(file.path), file.filename?.split('-').slice(1).join('-')); /*file.filename */
        });
      }
      
      // 추가로 req.body의 키/값을 FormData에 추가
      for (const [key, value] of Object.entries(req.body)) {
        form.append(key, value);
      }

      data = form;
      const contentLength = await new Promise((resolve, reject) => {
        form.getLength((err, length) => {
          if (err) reject(err);
          resolve(length);
        });
      });

      headers = {
        ...headers,
        ...form.getHeaders(),
        'content-length': contentLength, // 강제 추가
      };
    } else {
      data = req.body; // 일반 JSON 요청 처리
    }

    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers,
      data,
      timeout: 5000,
      responseType: req.headers.accept?.includes('application/json') ? 'json' : 'stream', // JSON 또는 스트림 처리
      maxBodyLength: Infinity,
      maxContentLength: Infinity
  });

    // 응답 헤더를 클라이언트에 전달
    for (const [key, value] of Object.entries(response.headers)) {
      if (key.toLowerCase() === 'set-cookie') {
        res.append('Set-Cookie', value);
      } else {
        res.set(key, value);
      }
    }

    // 스트림 데이터를 클라이언트로 전달
    if (response.data.pipe) {
      response.data.pipe(res);
    } else {
      res.status(response.status).send(response.data);
    }
  } catch (error) {
    console.error('백엔드 요청 실패:', error.message);
    res.status(500).json({ message: '서버 오류 발생.' });
  }

  // 파일 삭제 처리
  if (req.files) {
    for (const file of req.files) {
      fs.unlink(file.path, (err) => {
        if (err) {
          console.error('파일 삭제 오류:', err);
          return;
        }
      });
    }
  }
};

// 모든 API 요청을 NestJS로 프록시
app.use('/api/gemini', apiGeminiProxy);

const upload = multer({storage: multer.diskStorage({ // 파일 저장 위치 설정
  destination: (req, file, callback) => {
    callback(null, './uploads');
  },
  filename: (req, file, callback) => {
    const decodedName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const uniqueSuffix = Date.now() + "_" + Math.round(Math.random() * 1e9);
    callback(null, `${uniqueSuffix}-${decodedName}`);
  }})
});
app.use('/', upload.any(), apiProxy);

// React 앱 빌드된 파일 서빙 (배포 시)
app.use(express.static(path.join(__dirname, '../client/build')));

// React 앱을 위한 라우팅
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// 서버 시작
app.listen(port, () => {
  console.log(`서버가 ${port}번 port에서 실행 중입니다.`);
});
