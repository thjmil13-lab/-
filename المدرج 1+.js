import { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";

// ✅ ضع بيانات Firebase الخاصة بك هنا
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_ID",
  appId: "YOUR_APP_ID"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export default function Home() {
  const [user, setUser] = useState(null);
  const matchId = "match_1"; // معرف المباراة الافتراضي

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  return (
    <div style={styles.body}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1>🇸🇦 وش صاير بدورينا</h1>
          <p>تغطية مباشرة وتفاعل الجمهور</p>
        </header>

        <AuthSection user={user} />

        <div style={styles.mainGrid}>
          <LiveFeed matchId={matchId} />
          <ChatSection matchId={matchId} user={user} />
        </div>
      </div>
    </div>
  );
}

// مكون تسجيل الدخول
function AuthSection({ user }) {
  const login = () => signInWithPopup(auth, provider);
  const logout = () => signOut(auth);

  return (
    <div style={styles.authBox}>
      {user ? (
        <div style={styles.userInfo}>
          <span>مرحباً، {user.displayName} 👋</span>
          <button onClick={logout} style={styles.btnLog}>خروج</button>
        </div>
      ) : (
        <button onClick={login} style={styles.btnGoogle}>تسجيل دخول عبر قوقل 🚀</button>
      )}
    </div>
  );
}

// مكون أحداث المباراة
function LiveFeed({ matchId }) {
  const q = query(collection(db, "matches", matchId, "events"), orderBy("timestamp", "desc"));
  const [events, loading] = useCollection(q);

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>⏱️ أحداث المباراة</h3>
      <div style={styles.list}>
        {loading && <p>جاري التحميل...</p>}
        {events?.docs.map(doc => (
          <div key={doc.id} style={{...styles.eventItem, borderRight: `5px solid ${getTypeColor(doc.data().type)}`}}>
            <span style={styles.minute}>{doc.data().minute}'</span>
            <span>{doc.data().text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// مكون الشات
function ChatSection({ matchId, user }) {
  const [msg, setMsg] = useState("");
  const q = query(collection(db, "matches", matchId, "chat"), orderBy("timestamp", "asc"));
  const [messages] = useCollection(q);

  const send = async (e) => {
    e.preventDefault();
    if (!msg.trim() || !user) return;
    await addDoc(collection(db, "matches", matchId, "chat"), {
      userName: user.displayName,
      text: msg,
      timestamp: serverTimestamp()
    });
    setMsg("");
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>🏟️ المدرج (Live Chat)</h3>
      <div style={styles.chatBox}>
        {messages?.docs.map(doc => (
          <div key={doc.id} style={styles.msg}>
            <strong style={styles.msgUser}>{doc.data().userName}:</strong> {doc.data().text}
          </div>
        ))}
      </div>
      {user && (
        <form onSubmit={send} style={styles.inputGroup}>
          <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="وش رأيك في المباراة؟" style={styles.input} />
          <button type="submit" style={styles.btnSend}>إرسال</button>
        </form>
      )}
    </div>
  );
}

const getTypeColor = (type) => {
  if (type === "goal") return "#27ae60";
  if (type === "red_card") return "#e74c3c";
  if (type === "yellow_card") return "#f1c40f";
  return "#34495e";
};

const styles = {
  body: { backgroundColor: "#f0f2f5", minHeight: "100vh", direction: "rtl", fontFamily: "Tahoma, sans-serif" },
  container: { maxWidth: "900px", margin: "0 auto", padding: "20px" },
  header: { textAlign: "center", marginBottom: "30px", color: "#1a2e35" },
  authBox: { textAlign: "center", marginBottom: "20px" },
  mainGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" },
  card: { background: "#fff", padding: "20px", borderRadius: "15px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" },
  cardTitle: { borderBottom: "2px solid #eee", paddingBottom: "10px", marginBottom: "15px" },
  eventItem: { padding: "10px", background: "#f9f9f9", marginBottom: "10px", borderRadius: "5px", display: "flex", gap: "10px" },
  minute: { fontWeight: "bold", color: "#2980b9" },
  chatBox: { height: "300px", overflowY: "auto", marginBottom: "15px", padding: "10px", background: "#fafafa" },
  msg: { marginBottom: "8px", fontSize: "14px" },
  msgUser: { color: "#2c3e50" },
  inputGroup: { display: "flex", gap: "5px" },
  input: { flex: 1, padding: "10px", borderRadius: "5px", border: "1px solid #ddd" },
  btnSend: { padding: "10px 20px", background: "#27ae60", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" },
  btnGoogle: { padding: "12px 25px", background: "#4285F4", color: "#fff", border: "none", borderRadius: "25px", cursor: "pointer", fontWeight: "bold" },
  btnLog: { padding: "5px 10px", background: "#ddd", border: "none", borderRadius: "5px", marginRight: "10px" }
};