// Account (Change Password) Module

(function() {
  function bindChangePasswordButton() {
    const existing = document.getElementById('openChangePassword');
    if (existing) {
      existing.removeEventListener('click', openChangePasswordModal);
      existing.addEventListener('click', openChangePasswordModal);
    }
  }

  function openChangePasswordModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4';
    modal.innerHTML = `
      <div class="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-6 w-full max-w-sm">
        <h3 class="text-lg font-semibold text-white mb-4">Change Password</h3>
        <form id="changePasswordForm" class="space-y-3">
          <div>
            <label class="block text-sm text-neutral-300 mb-1">Current Password</label>
            <input id="currentPassword" type="password" class="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white" required />
          </div>
          <div>
            <label class="block text-sm text-neutral-300 mb-1">New Password</label>
            <input id="newPassword" type="password" class="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white" required />
          </div>
          <div>
            <label class="block text-sm text-neutral-300 mb-1">Confirm New Password</label>
            <input id="confirmPassword" type="password" class="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white" required />
          </div>
          <div class="flex gap-3 mt-4">
            <button type="button" id="cancelChangePwd" class="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white rounded px-4 py-2">Cancel</button>
            <button type="submit" class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded px-4 py-2">Update</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#cancelChangePwd').addEventListener('click', () => document.body.removeChild(modal));
    modal.addEventListener('click', (e) => { if (e.target === modal) document.body.removeChild(modal); });

    modal.querySelector('#changePasswordForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      const currentPassword = modal.querySelector('#currentPassword').value.trim();
      const newPassword = modal.querySelector('#newPassword').value.trim();
      const confirmPassword = modal.querySelector('#confirmPassword').value.trim();

      if (!currentPassword || !newPassword) {
        alert('Please fill all fields');
        return;
      }
      if (newPassword !== confirmPassword) {
        alert('New password and confirm password do not match');
        return;
      }
      if (newPassword.length < 6) {
        alert('New password must be at least 6 characters');
        return;
      }

      try {
        const resp = await fetch('/api/account/password', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
        });
        const data = await resp.json();
        if (resp.ok && data.success) {
          if (window.showModernAlert) window.showModernAlert('Password updated successfully', 'success');
          document.body.removeChild(modal);
        } else {
          alert(data.message || 'Failed to change password');
        }
      } catch (err) {
        console.error('Change password error:', err);
        alert('Failed to change password');
      }
    });
  }

  // Disabled - Change password functionality is now handled by shop-settings module
  // if (document.readyState === 'loading') {
  //   document.addEventListener('DOMContentLoaded', bindChangePasswordButton);
  // } else {
  //   bindChangePasswordButton();
  // }

  // Note: Change password functionality is now handled by the shop-settings module
})();


