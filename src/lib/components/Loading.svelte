<div class="loading">
    <span></span>
    <span></span>
    <span></span>
</div>

<style>
    .loading {
      display: flex;
      gap: 6px;
    }
    
    .loading span {
      width: 8px;
      height: 8px;
      background-color: #333;
      border-radius: 50%;
      animation: bounce 0.6s infinite ease-in-out;
    }
    
    .loading span:nth-child(1) {
      animation-delay: 0s;
    }
    .loading span:nth-child(2) {
      animation-delay: 0.2s;
    }
    .loading span:nth-child(3) {
      animation-delay: 0.4s;
    }
    
    @keyframes bounce {
      0%, 80%, 100% {
        transform: scale(0.6);
        opacity: 0.5;
      }
      40% {
        transform: scale(1);
        opacity: 1;
      }
    }
</style>