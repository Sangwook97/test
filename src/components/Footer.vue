<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="brand">
        <h3 class="service-name">LocalHub</h3>
        <p class="tagline">심플하고 직관적인 여행 정보 서비스</p>
      </div>

      <nav class="footer-links" aria-label="Footer links">
        <a href="/privacy">개인정보처리방침</a>
        <a href="/terms">이용약관</a>
        <a href="/contact">문의</a>
      </nav>

      <div class="copyright">
        <small>Copyright © 2026 LocalHub. All rights reserved.</small>
      </div>
    </div>
  </footer>
</template>

<script>
export default {
  name: "Footer"
};
</script>

<style scoped>
.site-footer {
  background: #111827; /* 어두운 회색톤 */
  color: #e5e7eb; /* 가독성 좋은 연한 텍스트 */
  font-size: 14px;
  border-top: 1px solid rgba(255,255,255,0.04);
}

.footer-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.brand {
  min-width: 180px;
}

.service-name {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.tagline {
  margin: 4px 0 0 0;
  color: #9ca3af;
  font-size: 13px;
}

.footer-links {
  display: flex;
  gap: 16px;
  align-items: center;
  flex: 1 1 auto;
  justify-content: center;
}

.footer-links a {
  color: #d1d5db;
  text-decoration: none;
  transition: color .15s ease;
}

.footer-links a:hover {
  color: #ffffff;
  text-decoration: underline;
}

copyright {
  min-width: 180px;
  text-align: right;
}

copyright small {
  color: #9ca3af;
}

/* Responsive: 모바일에서 중앙 정렬, 세로 스택 */
@media (max-width: 640px) {
  .footer-inner {
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 18px;
  }

  .footer-links {
    order: 2;
    margin: 8px 0;
  }

  .brand, .copyright {
    width: 100%;
    text-align: center;
  }
}
</style>