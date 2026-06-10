export default function Navbar() {
  return (
    <nav className="w-full bg-white shadow-md p-4 flex justify-between">
      <div className="font-bold text-xl text-blue-600">SchooIOS</div>
      <div>
        <button className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-md">
          Đăng nhập
        </button>
      </div>
    </nav>
  );
}