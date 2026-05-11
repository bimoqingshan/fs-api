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
import { Avatar, Skeleton, Tag } from '@douyinfe/semi-ui';
import { VChart } from '@visactor/react-vchart';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const StatsCards = ({
  groupedStatsData,
  loading,
  getTrendSpec,
  CARD_PROPS,
  CHART_CONFIG,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Color mapping for each stats group
  const cardColorMap = ['fs-stats-card', 'fs-stats-card-green', 'fs-stats-card-indigo', 'fs-stats-card-amber'];

  return (
    <div className='mb-4'>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {groupedStatsData.map((group, idx) => (
          <div
            key={idx}
            className={`fs-stats-card ${cardColorMap[idx % cardColorMap.length]} border-0 w-full`}
          >
            <div className='card-glow' />
            <div className='p-4'>
              <div className='card-title mb-3'>{group.title}</div>
              <div className='space-y-4'>
                {group.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className='flex items-center justify-between cursor-pointer'
                    onClick={item.onClick}
                  >
                    <div className='flex items-center'>
                      <Avatar
                        className='mr-3'
                        size='small'
                        color={item.avatarColor}
                      >
                        {item.icon}
                      </Avatar>
                      <div>
                        <div className='text-xs text-gray-500'>{item.title}</div>
                        <div className='card-value'>
                          <Skeleton
                            loading={loading}
                            active
                            placeholder={
                              <Skeleton.Paragraph
                                active
                                rows={1}
                                style={{
                                  width: '65px',
                                  height: '24px',
                                  marginTop: '4px',
                                }}
                              />
                            }
                          >
                            {item.value}
                          </Skeleton>
                        </div>
                      </div>
                    </div>
                    {item.title === t('当前余额') ? (
                      <Tag
                        color='white'
                        shape='circle'
                        size='large'
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/console/topup');
                        }}
                      >
                        {t('充值')}
                      </Tag>
                    ) : (
                      (loading ||
                        (item.trendData && item.trendData.length > 0)) && (
                        <div className='w-24 h-10'>
                          <VChart
                            spec={getTrendSpec(item.trendData, item.trendColor)}
                            option={CHART_CONFIG}
                          />
                        </div>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsCards;
