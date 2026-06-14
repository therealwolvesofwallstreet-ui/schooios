import React, { useState, useEffect } from 'react';
import { 
  BookOpen, MonitorPlay, Utensils, Dumbbell, Trophy, Flag, 
  GraduationCap, Library, Car, Medal, Waves, Building2, MapPin
} from 'lucide-react';

// Chèn CSS toàn cục cho Fonts và Grain (Tuân thủ tuyệt đối Playbook WARM F1-F7)
const injectStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,600&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

  :root {
    --linen: #F5F1EA;
    --linen2: #FBF8F1;
    --khaki: #EAE3D5;
    --line: #E2D9C8;
    --line2: #CDBFA6;
    --camel: #B2967D;
    --cocoa: #7D5A44;
    --espresso: #4A342A;
    --wine: #743014;
    --caramel: #84592B;
    --olive: #9D9167;
    --cowhide: #442D1C;
    
    --disp: 'Cormorant Garamond', Georgia, serif;
    --sans: 'IBM Plex Sans', system-ui, sans-serif;
    --mono: 'IBM Plex Mono', ui-monospace, monospace;
  }

  body {
    background-color: var(--linen);
    color: var(--espresso);
    font-family: var(--sans);
    margin: 0;
    /* Nền Plaster ấm + Gradient ánh sáng theo Playbook */
    background-image: radial-gradient(120% 90% at 10% -5%, #FBF8F1 0%, transparent 55%),
                      radial-gradient(90% 80% at 95% 100%, #EFE6D7 0%, transparent 60%);
    background-attachment: fixed;
  }

  /* Grain noise tinh tế phủ lên toàn bộ để tạo chất liệu tĩnh */
  .plaster-grain {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.25;
    mix-blend-mode: multiply;
    z-index: 50;
  }

  .archive-scroll::-webkit-scrollbar { width: 6px; }
  .archive-scroll::-webkit-scrollbar-track { background: transparent; }
  .archive-scroll::-webkit-scrollbar-thumb { background: var(--line2); border-radius: 4px; }
`;

// Dữ liệu cấu trúc bản đồ
const mapData = [
  { id: 'gate', name: 'Cổng vào trường', type: 'entrance', position: { top: 2, left: 10, width: 15, height: 5 }, icon: MapPin, description: 'Cổng chính ra vào. Học sinh cần quẹt thẻ và tuân thủ quy định trang phục khi qua cổng.' },
  { id: 'parking-student', name: 'Nhà xe học sinh', type: 'parking', position: { top: 2, left: 38, width: 14, height: 10 }, icon: Car, description: 'Khu vực để xe đạp và xe máy điện dành cho học sinh toàn trường.' },
  { id: 'block-c', name: 'Dãy C', sub: 'Tin học - Thí nghiệm', type: 'academic', position: { top: 12, left: 47, width: 16, height: 8 }, icon: MonitorPlay, description: 'Tòa nhà chuyên dụng cho phòng máy tính và thực hành Hóa/Sinh/Lý.' },
  { id: 'block-a', name: 'Dãy A', sub: 'Lầu 1-3', type: 'academic', position: { top: 22, left: 45, width: 8, height: 32 }, icon: BookOpen, description: 'Khu vực phòng học lý thuyết dành cho các khối lớp.' },
  { id: 'block-b', name: 'Dãy B', sub: 'Lầu 1-3', type: 'academic', position: { top: 22, left: 57, width: 8, height: 32 }, icon: BookOpen, description: 'Khu vực phòng học lý thuyết dành cho các khối lớp.' },
  { id: 'canteen-1', name: 'Căn tin 1', type: 'service', position: { top: 10, left: 75, width: 10, height: 15 }, icon: Utensils, description: 'Khu ăn uống, phục vụ bữa sáng, ăn trưa và giải khát cho học sinh.' },
  { id: 'canteen-2', name: 'Căn tin 2', type: 'service', position: { top: 27, left: 75, width: 10, height: 15 }, icon: Utensils, description: 'Khu ăn uống mở rộng, giảm tải cho căn tin 1 vào giờ cao điểm.' },
  { id: 'library', name: 'Thư viện điện tử', type: 'academic', position: { top: 38, left: 28, width: 13, height: 16 }, icon: Library, description: 'Không gian yên tĩnh với hàng ngàn đầu sách và hệ thống máy tính tra cứu.' },
  { id: 'admin', name: 'Khu Hiệu bộ', type: 'admin', position: { top: 58, left: 26, width: 15, height: 26 }, icon: GraduationCap, description: 'Phòng làm việc của Ban Giám hiệu, phòng Giáo viên và các bộ phận hành chính.' },
  { id: 'flagpole', name: 'Cột cờ', type: 'landmark', position: { top: 62, left: 54, width: 2, height: 10 }, icon: Flag, description: 'Nơi diễn ra các buổi lễ chào cờ đầu tuần và sự kiện quan trọng của trường.' },
  { id: 'block-d', name: 'Dãy D', sub: 'Lầu 1-3', type: 'academic', position: { top: 58, left: 57, width: 8, height: 26 }, icon: null, description: 'Khu vực phòng học và các phòng sinh hoạt Câu lạc bộ.' },
  { id: 'tradition', name: 'Nhà truyền thống', type: 'admin', position: { top: 88, left: 38, width: 18, height: 6 }, icon: Building2, description: 'Nơi lưu giữ những kỷ vật, thành tích và lịch sử phát triển của nhà trường.' },
  { id: 'parking-teacher', name: 'Nhà xe giáo viên', type: 'parking', position: { top: 68, left: 8, width: 8, height: 18 }, icon: Car, description: 'Khu vực đỗ xe riêng dành cho Cán bộ, Giáo viên và Nhân viên nhà trường.' },
  { id: 'football', name: 'Sân bóng đá', type: 'sports', position: { top: 46, left: 75, width: 11, height: 11 }, icon: Trophy, description: 'Sân cỏ nhân tạo dành cho môn thể dục và các giải đấu cấp trường.' },
  { id: 'basketball', name: 'Sân bóng rổ', type: 'sports', position: { top: 59, left: 76.5, width: 8, height: 9 }, icon: Dumbbell, description: 'Sân bóng rổ tiêu chuẩn.' },
  { id: 'volleyball', name: 'Sân bóng chuyền', type: 'sports', position: { top: 70, left: 76.5, width: 8, height: 9 }, icon: Medal, description: 'Khu vực tập luyện và thi đấu bóng chuyền.' },
  { id: 'gymnasium', name: 'Nhà thi đấu', type: 'sports', position: { top: 62, left: 67, width: 8, height: 22 }, icon: Dumbbell, description: 'Nhà thi đấu đa năng có mái che dành cho cầu lông, bóng bàn.' },
  { id: 'pool', name: 'Hồ bơi', sub: 'Mới xây', type: 'sports', position: { top: 83, left: 74, width: 11, height: 11 }, icon: Waves, description: 'Hồ bơi tiêu chuẩn mới được đưa vào sử dụng cho môn bơi lội.' }
];

// Mapping token màu theo Playbook WARM
const styles = {
  academic: { bg: '#EAE3D5', border: '#CDBFA6', text: '#4A342A' }, // Khaki / Line2 / Espresso
  admin: { bg: '#B2967D', border: '#84592B', text: '#FBF8F1' },    // Camel / Caramel / Linen2
  sports: { bg: '#9D9167', border: '#7D5A44', text: '#FBF8F1' },   // Olive (Rare) / Cocoa / Linen2
  service: { bg: '#FBF8F1', border: '#CDBFA6', text: '#7D5A44' },  // Linen2 / Line2 / Cocoa
  parking: { bg: 'transparent', border: '#B2967D', text: '#7D5A44', dashed: true }, // Camel / Cocoa
  landmark: { bg: 'transparent', border: 'transparent', text: '#743014' }, // Spiced Wine (CTA duy nhất)
  entrance: { bg: '#442D1C', border: '#36210F', text: '#F5F1EA' }  // Cowhide (Void depth) / Linen
};

const typeLabels = {
  academic: 'Học tập & Thực hành',
  admin: 'Khu Hành chính',
  sports: 'Khu Thể thao',
  service: 'Dịch vụ · Căn tin',
  parking: 'Nhà để xe',
  landmark: 'Cảnh quan chính',
  entrance: 'Lối ra vào'
};

export default function WarmImmersiveMap() {
  const [selectedArea, setSelectedArea] = useState(null);
  const [hoveredArea, setHoveredArea] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Inject custom styles vào head khi render
    const styleSheet = document.createElement("style");
    styleSheet.innerText = injectStyles;
    document.head.appendChild(styleSheet);
    return () => styleSheet.remove();
  }, []);

  const filteredData = mapData.filter(item => filter === 'all' || item.type === filter);

  return (
    <div className="min-h-screen p-6 md:p-10 flex flex-col xl:flex-row gap-10" style={{ fontFamily: 'var(--sans)', color: 'var(--espresso)', backgroundColor: 'var(--linen)' }}>
      
      {/* CỘT TRÁI: BẢN ĐỒ */}
      <div className="flex-1 flex flex-col relative z-10">
        
        {/* Header mang phong cách Archive */}
        <div className="mb-8 border-b pb-4" style={{ borderColor: 'var(--line)' }}>
          <div className="text-[11px] uppercase tracking-[0.22em] mb-3" style={{ fontFamily: 'var(--mono)', color: 'var(--camel)' }}>
            SchooIOS · Immersive Map · F2
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold m-0 leading-tight tracking-tight" style={{ fontFamily: 'var(--disp)' }}>
            Sơ Đồ Khuôn Viên Trường
          </h1>
        </div>

        {/* Khung chứa bản đồ */}
        <div className="relative w-full rounded-md shadow-sm overflow-hidden" 
             style={{ aspectRatio: '16/11', minHeight: '550px', backgroundColor: 'var(--linen2)', border: '1px solid var(--line)' }}>
          
          {/* Lớp Plaster Grain noise (Tuân thủ UI WARM) */}
          <svg className="plaster-grain w-full h-full">
            <filter id="noiseFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
            </filter>
            <rect width="100%" height="100%" filter="url(#noiseFilter)"></rect>
          </svg>

          {/* Render Các Khu Vực */}
          {filteredData.map((area) => {
            const isSelected = selectedArea?.id === area.id;
            const isHovered = hoveredArea?.id === area.id;
            const st = styles[area.type];
            
            // Interaction styles (Tôn trọng quiet/ease-emerge của playbook)
            const baseClass = "absolute flex flex-col items-center justify-center p-1 transition-all duration-500 cursor-pointer ease-out";
            const borderStyle = st.dashed ? `1px dashed ${st.border}` : `1px solid ${st.border}`;
            
            let interactionStyle = {};
            if (isSelected) {
               // Chọn: Viền Spiced Wine duy nhất
               interactionStyle = { borderColor: 'var(--wine)', outline: '1px solid var(--wine)', outlineOffset: '2px', zIndex: 30, backgroundColor: st.bg === 'transparent' ? 'var(--khaki)' : st.bg };
            } else if (isHovered) {
               // Hover nhẹ nhàng
               interactionStyle = { transform: 'translateY(-2px)', zIndex: 20, boxShadow: '0 4px 12px rgba(125, 90, 68, 0.15)' };
            }

            return (
              <div
                key={area.id}
                onClick={() => setSelectedArea(area)}
                onMouseEnter={() => setHoveredArea(area)}
                onMouseLeave={() => setHoveredArea(null)}
                className={`${baseClass} ${area.type === 'entrance' ? 'rounded-full' : 'rounded-[4px]'}`}
                style={{
                  top: `${area.position.top}%`,
                  left: `${area.position.left}%`,
                  width: `${area.position.width}%`,
                  height: `${area.position.height}%`,
                  backgroundColor: st.bg,
                  border: borderStyle,
                  color: st.text,
                  ...interactionStyle
                }}
              >
                {area.type === 'landmark' ? (
                  <div className="flex flex-col items-center justify-end h-full pb-1">
                    <div className="w-[2px] h-8 mt-1" style={{ backgroundColor: 'var(--cocoa)' }}></div>
                  </div>
                ) : (
                  <>
                    <span className="text-[11px] font-medium text-center leading-tight px-1 hidden md:block" style={{ fontFamily: 'var(--sans)' }}>
                      {area.name}
                    </span>
                    {area.sub && (
                      <span className="text-[9px] text-center opacity-80 mt-0.5 leading-tight hidden lg:block" style={{ fontFamily: 'var(--mono)' }}>
                        {area.sub}
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CỘT PHẢI: BẢNG LƯU TRỮ (ARCHIVE INDEX) */}
      <div className="w-full xl:w-80 flex flex-col gap-6 relative z-10 pt-1">
        
        {/* Panel Chi Tiết (Case Detail Spine style) */}
        <div className="flex-1 min-h-[300px] rounded-md p-6 flex flex-col" 
             style={{ backgroundColor: 'var(--linen2)', border: '1px solid var(--line)' }}>
          
          <h2 className="text-[14px] uppercase tracking-wider mb-6 flex items-center gap-2" 
              style={{ fontFamily: 'var(--mono)', color: 'var(--cocoa)', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
            Hồ Sơ Lưu Trữ
          </h2>
          
          {selectedArea ? (
            <div className="animate-fade-in archive-scroll overflow-y-auto pr-2">
              <div className="flex items-center gap-4 mb-4">
                <div>
                  <h3 className="text-2xl m-0 leading-none" style={{ fontFamily: 'var(--disp)', fontWeight: 600, color: 'var(--espresso)' }}>
                    {selectedArea.name}
                  </h3>
                  {selectedArea.sub && (
                    <p className="text-[13px] italic mt-1 mb-0" style={{ fontFamily: 'var(--disp)', color: 'var(--cocoa)' }}>
                      {selectedArea.sub}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="inline-block px-2 py-1 text-[11px] font-medium rounded-sm mb-5 uppercase tracking-wider" 
                   style={{ backgroundColor: 'var(--khaki)', color: 'var(--cocoa)', fontFamily: 'var(--mono)' }}>
                Phân khu: {typeLabels[selectedArea.type] || 'N/A'}
              </div>
              
              <p className="text-[14px] leading-relaxed" style={{ color: 'var(--cocoa)', borderLeft: '2px solid var(--wine)', paddingLeft: '12px' }}>
                {selectedArea.description}
              </p>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
              <p className="text-[13px] italic" style={{ fontFamily: 'var(--disp)', color: 'var(--cocoa)' }}>
                Lựa chọn một tòa nhà <br/>để truy xuất hồ sơ chi tiết.
              </p>
            </div>
          )}
        </div>

        {/* Chú giải (Legend & Navigation) */}
        <div className="rounded-md p-6" style={{ backgroundColor: 'var(--linen2)', border: '1px solid var(--line)' }}>
          <h2 className="text-[12px] uppercase tracking-wider mb-4" 
              style={{ fontFamily: 'var(--mono)', color: 'var(--cocoa)', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
            Chú giải hệ thống
          </h2>
          
          <div className="flex flex-col gap-1.5">
            <button 
              onClick={() => setFilter('all')}
              className="flex items-center gap-3 p-2 rounded-sm text-[13px] transition-all text-left w-full border border-transparent outline-none"
              style={{ 
                backgroundColor: filter === 'all' ? 'var(--khaki)' : 'transparent',
                color: filter === 'all' ? 'var(--espresso)' : 'var(--cocoa)',
                fontFamily: 'var(--sans)'
              }}
            >
              <div className="w-[14px] h-[14px] rounded-full border" style={{ backgroundColor: 'var(--line)', borderColor: 'var(--cocoa)' }}></div>
              Hiển thị tổng thể
            </button>
            
            {Object.entries(typeLabels).map(([key, label]) => {
              const st = styles[key];
              const isSelected = filter === key;
              return (
                <button 
                  key={key}
                  onClick={() => setFilter(key)}
                  className="flex items-center gap-3 p-2 rounded-sm text-[13px] transition-all text-left w-full outline-none"
                  style={{ 
                    backgroundColor: isSelected ? 'var(--khaki)' : 'transparent',
                    border: isSelected ? '1px solid var(--line2)' : '1px solid transparent',
                    color: isSelected ? 'var(--espresso)' : 'var(--cocoa)'
                  }}
                >
                  <div className={`w-[14px] h-[14px] rounded-sm flex-shrink-0 ${key === 'entrance' ? 'rounded-full' : ''}`} 
                       style={{ 
                         backgroundColor: st.bg === 'transparent' ? 'var(--linen)' : st.bg, 
                         border: st.dashed ? `1px dashed ${st.border}` : `1px solid ${st.border}` 
                       }}>
                  </div>
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}