import { db } from "./Firebase.js";
import { collection, getDocs } from "firebase/firestore";

async function loadAssignments() {
  const querySnapshot = await getDocs(collection(db, "assignments"));
  
  querySnapshot.forEach((doc) => {
    console.log(doc.data());
  });
}

loadAssignments();