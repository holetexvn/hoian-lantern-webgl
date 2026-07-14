# Design: "H1 Neural Chip" — Interactive Product Page Demo

**Ngày:** 2026-07-14
**Mục đích:** Demo cá nhân khoe kỹ thuật WebGL/creative coding. Không phải trang production, không cần SEO, không cần backend.
**Stack đã chốt:** Vite + vanilla Three.js + GSAP ScrollTrigger + GLSL viết tay. JavaScript thuần (không TypeScript). Không tải 3D asset ngoài, mọi thứ dựng procedural.

## Tổng quan

Một trang product-page liền mạch kiểu awwwards cho con chip AI hư cấu "HoleTex H1 Neural Chip". Ba nhóm hiệu ứng hòa vào một câu chuyện: WebGL fluid/particle shader, 3D scroll-telling kiểu Apple, và cursor interaction xuyên suốt.

## 1. Trải nghiệm (narrative theo scroll, 5 màn)

1. **Hero — fluid**: Full-screen fluid simulation (mực loang theo chuột, tông xanh/tím electric trên nền đen). Typography lớn: "H1. Neural Silicon." Chip là bóng mờ ẩn sau lớp fluid. Di chuột đến đâu mực loang đến đó.
2. **Reveal**: Scroll xuống, fluid tan dần, camera đẩy vào, chip nổi lên từ bóng tối, xoay chậm, các đường mạch trên bề mặt phát sáng lan dần (pulse chạy dọc trace).
3. **Exploded view**: Chip tách thành 5 lớp lơ lửng theo scroll: heatspreader, die (compute cores), cache, interposer, substrate + pin grid. Mỗi lớp có label chú thích (HTML overlay bám tọa độ 3D). Scroll ngược thì các lớp khép lại.
4. **Data flow**: Các lớp ráp lại, ~50k particles phun qua chip như luồng data, bay theo curl noise, đổi màu theo tốc độ. Cursor là attractor hút/đẩy luồng particle.
5. **Specs + outro**: Grid thông số hư cấu (ví dụ 128 TOPS, 2nm process) với counter chạy số khi vào viewport, CTA button magnetic, footer.

**Cursor xuyên suốt:** custom cursor (chấm + vòng trễ lerp), magnetic trên element tương tác, cursor tương tác cả 2 hệ WebGL (đẩy fluid màn 1, hút particle màn 4). Trên mobile: tắt custom cursor, touch drag thay chuột.

## 2. Kiến trúc code

```
fable-5-demo/
  index.html            — DOM sections (tạo scroll height + text content)
  src/
    main.js             — bootstrap, RAF loop duy nhất, resize
    core/
      stage.js          — WebGLRenderer, scene, camera, postprocessing (bloom, grain)
      scroll.js         — GSAP ScrollTrigger: 1 master timeline scrub theo scroll
      pointer.js        — trạng thái chuột/touch thống nhất (position + velocity)
      quality.js        — detect tier máy → DPR, sim resolution, particle count
    fx/
      fluid/            — sim FBO ping-pong + GLSL shaders (advect, pressure, dye)
      particles/        — GPGPU particle system + curl noise shader
      cursor.js         — DOM cursor + magnetic elements
    chip/
      chip.js           — dựng chip procedural (5 group = 5 lớp exploded)
      materials.js      — ShaderMaterial: kim loại, silicon die, trace phát sáng
    ui/
      annotations.js    — label HTML bám anchor 3D (project ra screen space)
```

**Nguyên tắc:**
- Một canvas WebGL `position: fixed` nằm sau DOM. DOM lo scroll + text, canvas lo hình.
- ScrollTrigger scrub một master timeline duy nhất; timeline set camera, độ tách lớp chip, và uniforms.
- Mỗi module fx độc lập, nhận `(pointer, progress, dt)` qua interface rõ ràng, bật/tắt riêng được.
- Một RAF loop duy nhất trong main.js điều phối mọi update.

## 3. Kỹ thuật lõi từng hiệu ứng

- **Fluid**: stable fluids (Jos Stam) trên FBO ping-pong: advection → divergence → ~20 vòng Jacobi pressure → gradient subtract, kèm dye buffer cho màu. Sim chạy half-resolution. Mouse velocity bơm lực + dye vào sim.
- **Chip procedural**: substrate là rounded box; pin grid là 1 InstancedMesh (~1000 chân); trace mạch là emissive texture vẽ bằng offscreen canvas 2D (đường Manhattan ngẫu nhiên); pulse sáng chạy bằng time uniform. Không asset ngoài.
- **Particles**: GPGPU — position/velocity lưu trong texture, update bằng shader (curl noise + lực hút về đường bay xuyên chip + lực từ cursor), render instanced points, additive blending, ăn bloom.
- **Scroll**: GSAP master timeline có label per màn, camera keyframe giữa các label, scrub 2 chiều mượt.
- **Post-processing**: UnrealBloomPass (emissive nở sáng) + film grain + vignette nhẹ.

## 4. Performance và fallback

- `quality.js`: đo DPR + `hardwareConcurrency` + probe FPS vài giây đầu → 3 tier:
  - fluid sim resolution 128 / 256 / 512
  - particle count 10k / 30k / 100k
  - DPR clamp 1 / 1.5 / 2
- Chỉ chạy fluid pass khi hero còn trong viewport. Tab ẩn thì pause RAF.
- `prefers-reduced-motion`: bỏ scrub animation, thay bằng fade tĩnh.
- Không có WebGL2: hiện fallback tĩnh tối giản (message + ảnh).

## 5. Verify / tiêu chí thành công

- Dev bằng Vite; tự verify bằng browser: scroll đủ 5 màn, screenshot từng màn, console sạch error.
- `?debug` query param bật FPS meter + lil-gui chỉnh tham số fluid/particle.
- **Thành công khi:** 60fps ở tier mặc định trên máy dev, đủ 5 màn hoạt động scrub 2 chiều, cả 3 nhóm hiệu ứng hiện diện rõ.

## Ngoài scope (YAGNI)

- Không TypeScript, không test framework (verify bằng mắt + console).
- Không tối ưu SEO, không analytics, không deploy pipeline (chạy local; deploy tính sau nếu muốn).
- Không sound design.
