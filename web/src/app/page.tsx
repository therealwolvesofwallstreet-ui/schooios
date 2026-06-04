import Navbar from "../components/layout/Navbar";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="p-8">
        <h1 className="text-4xl text-blue-600 font-bold">Xin chào, đây là trang chủ!</h1>
      </div>
    </main>
  );
}