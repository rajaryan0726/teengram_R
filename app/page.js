import Image from "next/image";
import Landingpage from "./Components/Landingpage";
import Navbar from "./Components/Sidebar";
export default function Home() {
  return (
    <div>
      <Navbar/>
      <Landingpage/>
    </div>
  );
}
