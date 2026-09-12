import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyD4ohEPONTSoUAwCP21frdhbHbsBMJ2CK8",
  authDomain: "test-class-wall-0912.firebaseapp.com",
  projectId: "test-class-wall-0912",
  storageBucket: "test-class-wall-0912.firebasestorage.app",
  messagingSenderId: "1098937315737",
  appId: "1:1098937315737:web:6a5b145addf98865b8e308"
};

// Firebase, Firestore 및 Auth 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 현재 로그인한 사용자 정보를 담을 변수
let currentUser = null;


// ===================================================
// 로그인 / 로그아웃 관련 기능
// ===================================================

// 구글 로그인 팝업 띄우기
async function loginWithGoogle() {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("구글 로그인 실패:", error);
    alert("로그인에 실패했습니다: " + error.message);
  }
}

// 로그아웃하기
async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("로그아웃 실패:", error);
    alert("로그아웃에 실패했습니다.");
  }
}

// 상단 사용자 영역(userArea) 화면 그리기
function renderUserArea() {
  const userArea = document.getElementById("userArea");
  if (!userArea) return;

  userArea.innerHTML = "";

  if (currentUser) {
    // 로그인된 상태: 인사말과 로그아웃 버튼 표시
    const greeting = document.createElement("span");
    greeting.textContent = `${currentUser.displayName || "선생님"}님 환영합니다!`;
    userArea.appendChild(greeting);

    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "로그아웃";
    logoutBtn.onclick = logout;
    userArea.appendChild(logoutBtn);
  } else {
    // 미로그인 상태: 안내 문구와 Google 로그인 버튼 표시
    const notice = document.createElement("span");
    notice.textContent = "메모를 쓰려면 로그인이 필요합니다.";
    userArea.appendChild(notice);

    const loginBtn = document.createElement("button");
    loginBtn.textContent = "Google 로그인";
    loginBtn.onclick = loginWithGoogle;
    userArea.appendChild(loginBtn);
  }
}

// 로그인 상태 변경 감지 리스너 (로그인/로그아웃 시 자동 실행)
onAuthStateChanged(auth, function (user) {
  currentUser = user;
  renderUserArea();
});


// ===================================================
// 데이터를 다루는 함수 세 개
// 백엔드 1 시간에 이 세 개가 Firestore를 쓰는 코드로 바뀝니다.
// ===================================================

// 메모를 읽어 옵니다.
// Firestore의 memos 컬렉션에서 createdAt 순서로 정렬하여 가져옵니다.
async function loadMemos() {
  try {
    const q = query(collection(db, "memos"), orderBy("createdAt"));
    const snapshot = await getDocs(q);
    const list = [];
    snapshot.forEach(function (docSnap) {
      list.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });
    return list;
  } catch (error) {
    console.error("메모 불러오기 실패:", error);
    return [];
  }
}

// 메모를 새로 씁니다. (5자 이상 50자 이하일 때만 저장)
// 백엔드 2: 여기에 "누가 썼는지"(uid)를 함께 저장하게 됩니다.
async function addMemo(text) {
  // 글자 수 검증: 5글자 이상 50글자 이하
  if (text.length < 5 || text.length > 50) {
    alert("메모는 5글자 이상 50글자 이하로 입력해 주세요. (현재 " + text.length + "자)");
    return;
  }

  try {
    await addDoc(collection(db, "memos"), {
      text: text,
      createdAt: Date.now()
    });
  } catch (error) {
    console.error("메모 저장 실패:", error);
    alert("메모 저장에 실패했습니다. Firestore 규칙이나 설정을 확인해 주세요.");
  }
}

// 메모를 지웁니다.
// 백엔드 2: 지금은 누구든 남의 메모를 지울 수 있습니다. 이걸 막는 것이 과제입니다.
async function deleteMemo(id) {
  try {
    await deleteDoc(doc(db, "memos", id));
  } catch (error) {
    console.error("메모 삭제 실패:", error);
    alert("메모 삭제에 실패했습니다.");
  }
}


// ===================================================
// 화면 그리기
// ===================================================

async function render() {
  const wall = document.getElementById("wall");
  wall.innerHTML = "";

  const list = await loadMemos();
  list.forEach(function (memo) {
    wall.appendChild(makeMemo(memo));
  });
}

// 메모 한 장 만들기
function makeMemo(memo) {
  const div = document.createElement("div");
  div.className = "memo";

  const del = document.createElement("button");
  del.textContent = "×";
  del.onclick = async function () {
    await deleteMemo(memo.id);
    await render();
  };
  div.appendChild(del);

  const span = document.createElement("span");
  span.textContent = memo.text;
  div.appendChild(span);

  return div;
}


// ===================================================
// 담벼락 게시물에 대한 AI 코멘트 받기
// 게시물 내용만 보내며 로그인 정보는 보내지 않습니다.
// ===================================================

const aiCommentButton = document.getElementById("aiCommentButton");
const aiComment = document.getElementById("aiComment");

aiCommentButton.onclick = async function () {
  aiCommentButton.disabled = true;
  aiCommentButton.textContent = "AI가 살펴보는 중...";
  aiComment.style.display = "block";
  aiComment.textContent = "담벼락 게시물을 읽고 있습니다.";

  try {
    const list = await loadMemos();
    const memos = list
      .map(function (memo) {
        return memo.text;
      })
      .filter(function (text) {
        return typeof text === "string" && text.trim() !== "";
      });

    if (memos.length === 0) {
      aiComment.textContent = "코멘트할 게시물이 없습니다.";
      return;
    }

    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memos: memos })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "AI 코멘트를 불러오지 못했습니다.");
    }

    aiComment.textContent = data.comment;
  } catch (error) {
    console.error("AI 코멘트 요청 실패:", error);
    aiComment.textContent = error.message || "AI 코멘트를 불러오지 못했습니다.";
  } finally {
    aiCommentButton.disabled = false;
    aiCommentButton.textContent = "AI 코멘트 받기";
  }
};


// ===================================================
// 메모 쓰는 칸
// 엔터를 누르면 담벼락에 붙습니다 (줄바꿈은 Shift + 엔터)
// ===================================================

const input = document.getElementById("input");

input.onkeydown = async function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    const text = input.value.trim();
    if (text === "") return;

    if (text.length < 5 || text.length > 50) {
      alert("메모는 5글자 이상 50글자 이하로 입력해 주세요. (현재 " + text.length + "자)");
      return;
    }

    await addMemo(text);
    input.value = "";
    await render();
  }
};


// 첫 화면 그리기
renderUserArea();
render();
input.focus();
