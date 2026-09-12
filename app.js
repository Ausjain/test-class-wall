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

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyD4ohEPONTSoUAwCP21frdhbHbsBMJ2CK8",
  authDomain: "test-class-wall-0912.firebaseapp.com",
  projectId: "test-class-wall-0912",
  storageBucket: "test-class-wall-0912.firebasestorage.app",
  messagingSenderId: "1098937315737",
  appId: "1:1098937315737:web:6a5b145addf98865b8e308"
};

// Firebase 및 Firestore 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


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
render();
input.focus();
