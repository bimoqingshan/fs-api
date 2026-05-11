/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React from 'react';
import { RefreshCw, Search } from 'lucide-react';

const DashboardHeader = ({
  getGreeting,
  greetingVisible,
  showSearchModal,
  refresh,
  loading,
  t,
}) => {
  const ICON_BUTTON_CLASS = 'icon-btn';

  return (
    <div className='fs-dashboard-header flex items-center justify-between mb-4'>
      <h2
        className='text-2xl font-semibold transition-opacity duration-1000 ease-in-out'
        style={{ opacity: greetingVisible ? 1 : 0 }}
      >
        {getGreeting}
      </h2>
      <div className='flex gap-3'>
        <div
          onClick={showSearchModal}
          className='icon-btn icon-btn-search'
          role='button'
          tabIndex={0}
        >
          <Search size={16} />
        </div>
        <div
          onClick={refresh}
          className={`icon-btn icon-btn-refresh ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          role='button'
          tabIndex={0}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
