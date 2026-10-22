import React, { useState, useEffect } from 'react';
import { MessageSquare, FolderKanban, ChevronRight, Hash } from 'lucide-react';
import { ProjectChatTab } from '../components/ProjectChatTab.tsx';
import { Project } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useProjectsQuery } from '../lib/queries.ts';
import { apiFetch } from '../lib/api.ts';

export const ChatView: React.FC = () => {
  const { currentUser } = useAuth();
  const { data: projects = [], isLoading: loading } = useProjectsQuery(currentUser?.id);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0]);
    }
  }, [projects, selectedProject]);

  // Fetch unread count map across all accessible projects
  const fetchUnreadCounts = async () => {
    try {
      const res = await apiFetch('/api/chat/unread-counts');
      if (res.ok) {
        const data = await res.json();
        setUnreadMap(data.unreadCounts || {});
      }
    } catch {
      // silent background sync
    }
  };

  useEffect(() => {
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#E8E2D5]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#231E1B]">
              <span className="sm:hidden">Chat</span>
              <span className="hidden sm:inline">Team Collaboration &amp; Chat</span>
            </h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#EAE3D5] text-[#60564C] shrink-0">
              Real-time
            </span>
          </div>
          <p className="text-xs lg:text-sm text-[#70685F] mt-0.5 break-words">
            Project-wise group discussions and private one-to-one direct messages
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-[#70685F]">Loading chat channels...</div>
      ) : projects.length === 0 ? (
        <div className="py-16 text-center space-y-2 bg-white rounded-2xl border border-[#E8E2D5] p-6">
          <MessageSquare className="w-10 h-10 text-[#DDD6C8] mx-auto" />
          <p className="font-serif text-sm font-bold text-[#231E1B]">No active projects found</p>
          <p className="text-xs text-[#70685F]">Create a project to start collaborating with the team.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Channels Selector */}
          <div className="lg:col-span-4 space-y-2">
            <div className="text-[11px] font-bold text-[#70685F] uppercase px-1 mb-1 flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5" />
              Project Channels
            </div>

            <div className="flex flex-row overflow-x-auto no-scrollbar gap-2 pb-1 lg:flex-col lg:overflow-visible lg:gap-1.5">
              {projects.map((proj) => {
                const isSelected = selectedProject?.id === proj.id;
                const unread = unreadMap[proj.id] || 0;
                return (
                  <button
                    key={proj.id}
                    onClick={() => setSelectedProject(proj)}
                    className={`shrink-0 w-auto min-w-[150px] max-w-[220px] lg:w-full lg:max-w-none text-left p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-white border-[#C85A32] shadow-xs ring-1 ring-[#C85A32]/20'
                        : 'bg-[#FBF9F4] border-[#E8E2D5] hover:bg-white hover:border-[#DDD6C8]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Hash className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#C85A32]' : 'text-[#70685F]'}`} />
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-[#C85A32]' : 'text-[#231E1B]'}`}>
                          {proj.name}
                        </span>
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-[#70685F] truncate mt-0.5">
                        {proj.phases?.length || 0} phases &bull; {proj.owner?.name || 'Owner'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {unread > 0 && (
                        <span className="px-1.5 py-0.2 text-[10px] font-bold bg-[#C85A32] text-white rounded-full">
                          {unread}
                        </span>
                      )}
                      <ChevronRight className={`w-4 h-4 shrink-0 hidden lg:block ${isSelected ? 'text-[#C85A32]' : 'text-[#C0B9AF]'}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Chat Conversation Canvas */}
          <div className="lg:col-span-8">
            {selectedProject ? (
              <ProjectChatTab
                key={selectedProject.id}
                projectId={selectedProject.id}
                projectName={selectedProject.name}
              />
            ) : (
              <div className="py-24 text-center text-xs text-[#70685F] bg-white rounded-2xl border border-[#E8E2D5]">
                Select a channel on the left to join the discussion.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
