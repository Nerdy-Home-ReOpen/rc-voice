import React, { useState, ChangeEvent } from "react";
import { Search, ChevronUp, ChevronDown } from "lucide-react";

// Components
import MarkdownViewer from "./MarkdownViewer";

// Types
import type { MenuItem, UserList, User, Server } from "@/types";

interface SettingPageProps {
  onClose: () => void;
  server: Server;
  users: UserList;
}

type TabType =
  | "基本資料"
  | "公告"
  | "會員管理"
  | "訪問許可權"
  | "會員申請管理"
  | "黑名單管理";

const SettingPage: React.FC<SettingPageProps> = ({
  onClose,
  server,
  users,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("基本資料");
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>("");

  const [sortField, setSortField] = useState<
    "name" | "permission" | "contribution" | "joinDate"
  >("permission");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (
    field: "name" | "permission" | "contribution" | "joinDate"
  ) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const renderPermissionText = (permission: number): string => {
    switch (permission) {
      case 1:
        return "遊客";
      case 2:
        return "會員";
      case 3:
        return "頻道管理員";
      case 4:
        return "頻道管理員";
      case 5:
        return "群管理員";
      case 6:
        return "群創建者";
      case 7:
        return "官方活動人員";
      case 8:
        return "官方人員";
      default:
        return "未知";
    }
  };

  const shareUrl = window.location.origin + `/?serverId=${server.id}`;

  const togglePreview = (): void => setIsPreviewMode(!isPreviewMode);

  const menuItems: MenuItem[] = [
    { id: "基本資料", label: "基本資料" },
    { id: "公告", label: "公告" },
    { id: "會員管理", label: "會員管理" },
    { id: "訪問許可權", label: "訪問許可權" },
    { id: "會員申請管理", label: "會員申請管理" },
    { id: "黑名單管理", label: "黑名單管理" },
  ];

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);

      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const renderContent = (): React.ReactElement | null => {
    switch (activeTab) {
      case "基本資料":
        return (
          <>
            <div className="flex mb-8">
              <div className="flex-1">
                <div className="mb-4">
                  <div className="flex items-center gap-4 mb-2">
                    <label className="w-20 text-right text-sm">名稱</label>
                    <input
                      type="text"
                      value={server.name}
                      className="flex-1 p-1 border rounded text-sm"
                      onChange={
                        /* 處理名稱變更 */
                        () => {}
                      }
                    />
                  </div>
                  <div className="flex items-center gap-4 mb-2">
                    <label className="w-20 text-right text-sm">ID</label>
                    <input
                      type="text"
                      value={server.id}
                      className="w-32 p-1 border rounded text-sm"
                      disabled
                    />
                  </div>
                  <div className="flex items-start gap-4 mb-2">
                    <label className="w-20 text-right text-sm">口號</label>
                    <textarea className="flex-1 p-2 border rounded text-sm h-20" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <label className="w-20 text-right text-sm">類型</label>
                    <select className="p-1 border rounded text-sm">
                      <option>遊戲</option>
                      <option>音樂</option>
                      <option>原神</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-20 text-right text-sm">等級</label>
                    <input
                      type="text"
                      value="8"
                      className="w-20 p-1 border rounded text-sm"
                      disabled
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-20 text-right text-sm">創建時間</label>
                    <input
                      type="text"
                      value="2014-10-11 19:15:44"
                      className="w-48 p-1 border rounded text-sm"
                      disabled
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="w-20 text-right text-sm">財富值</label>
                    <img
                      src="/golden_pea.png"
                      alt="Golden Pea"
                      className="w-4 h-4"
                    />
                    <input
                      type="text"
                      value="4157"
                      className="w-20 p-1 border rounded text-sm"
                      disabled
                    />
                  </div>
                </div>
              </div>

              {/* 頭像區域 */}
              <div className="w-48 flex flex-col items-center">
                <img
                  src="/logo_server_def.png"
                  alt="Avatar"
                  className="w-32 h-32 border-2 border-gray-300 mb-2"
                />
                <button className="px-4 py-1 bg-blue-50 hover:bg-blue-100 rounded text-sm">
                  更換頭像
                </button>
              </div>
            </div>

            {/* 網址和介紹 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <label className="text-sm">網址 {shareUrl}</label>
                <button
                  onClick={handleCopy}
                  className={`text-sm transition-colors ${
                    copySuccess
                      ? "text-green-600 hover:text-green-700"
                      : "text-blue-600 hover:text-blue-700"
                  }`}
                >
                  {copySuccess ? "已複製!" : "複製"}
                </button>
              </div>

              <div>
                <label className="block text-sm mb-1">介紹</label>
                <textarea className="w-full h-32 p-2 border rounded text-sm" />
              </div>
            </div>
          </>
        );

      case "公告":
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">公告編輯</label>
              <button
                onClick={togglePreview}
                className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 rounded"
              >
                {isPreviewMode ? "編輯" : "預覽"}
              </button>
            </div>

            <div className="border rounded p-4">
              {isPreviewMode ? (
                <div className="prose prose-sm max-w-none">
                  <MarkdownViewer markdownText={markdownContent} />
                </div>
              ) : (
                <textarea
                  className="w-full p-2 rounded text-sm min-h-[200px] font-mono"
                  value={markdownContent}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setMarkdownContent(e.target.value)
                  }
                  placeholder="在此輸入 Markdown 內容..."
                />
              )}
            </div>

            {!isPreviewMode && (
              <div className="text-xs text-gray-500">
                支援 Markdown 語法：
                <span className="font-mono">
                  **粗體**, *斜體*, # 標題, - 列表, ```程式碼```,
                  [連結](https://)
                </span>
              </div>
            )}
          </div>
        );

      case "會員管理":
        const getServerUsers = (): User[] => {
          if (!server?.userIds) return [];
          return Object.values(users).filter(
            (user) => user && user.id && server.userIds.includes(user.id)
          );
        };

        const usersList = (): UserList => {
          return getServerUsers()
            .filter((user) => {
              const permissionLevel = server.permissions?.[user.id] || 1;
              return permissionLevel < 7;
            })
            .reduce((acc, user) => {
              if (user?.id) {
                acc[user.id] = user;
              }
              return acc;
            }, {} as UserList);
        };

        const sortedUsers = Object.entries(usersList())
          .filter(([, user]) => {
            const displayName = (
              server.nicknames?.[user.id] ||
              user.name ||
              ""
            ).toLowerCase();
            return (
              displayName.includes(searchText.toLowerCase()) ||
              searchText === ""
            );
          })
          .sort(([, a], [, b]) => {
            const direction = sortDirection === "asc" ? 1 : -1;

            switch (sortField) {
              case "name":
                const nameA = server.nicknames?.[a.id] || a.name || "";
                const nameB = server.nicknames?.[b.id] || b.name || "";
                return direction * nameA.localeCompare(nameB);

              case "permission":
                const permissionA = server.permissions?.[a.id] || 1;
                const permissionB = server.permissions?.[b.id] || 1;
                return direction * (permissionA - permissionB);

              case "contribution":
                const contribA = server.contributions?.[a.id] || 0;
                const contribB = server.contributions?.[b.id] || 0;
                return direction * (contribA - contribB);

              case "joinDate":
                const dateA = server.joinDate[a.id] || a.createdAt;
                const dateB = server.joinDate[b.id] || b.createdAt;
                return direction * (dateA - dateB);

              default:
                return 0;
            }
          });

        return (
          <div className="flex flex-col">
            <div className="flex flex-row justify-between items-center mb-6  select-none">
              <span className="text-sm font-medium">
                會員: {sortedUsers.length}
              </span>
              <div className="flex justify-end items-center border rounded-md overflow-hidden">
                <Search className="text-gray-400 h-5 w-5 ml-2" />
                <input
                  type="text"
                  placeholder="輸入關鍵字搜尋"
                  className="w-60 px-2 py-1.5 text-sm border-none outline-none"
                  value={searchText}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSearchText(e.target.value)
                  }
                />
              </div>
            </div>

            <div className="flex flex-col border rounded-lg overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-gray-600 select-none">
                    <tr>
                      <th
                        className="px-4 py-3 text-left font-medium border-b cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center relative pr-6">
                          會員資料
                          <span className="absolute right-0">
                            {sortField === "name" &&
                              (sortDirection === "asc" ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              ))}
                          </span>
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left font-medium border-b cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("permission")}
                      >
                        <div className="flex items-center relative pr-6">
                          身分
                          <span className="absolute right-0">
                            {sortField === "permission" &&
                              (sortDirection === "asc" ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              ))}
                          </span>
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left font-medium border-b cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("contribution")}
                      >
                        <div className="flex items-center relative pr-6">
                          貢獻值
                          <span className="absolute right-0">
                            {sortField === "contribution" &&
                              (sortDirection === "asc" ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              ))}
                          </span>
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left font-medium border-b cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("joinDate")}
                      >
                        <div className="flex items-center relative pr-6">
                          入會時間
                          <span className="absolute right-0">
                            {sortField === "joinDate" &&
                              (sortDirection === "asc" ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              ))}
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map(([key, user]) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={`/channel/${user.gender}_${
                                server.permissions[user.id] || 0
                              }.png`}
                              className="w-4 h-5 select-none"
                              alt={user.name}
                            />
                            <div>
                              <div className="font-medium text-gray-900">
                                {server.nicknames?.[user.id] || user.name}
                              </div>
                              {server.nicknames[user.id] && (
                                <div className="text-gray-500 text-xs">
                                  原始名稱: {user.name}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-xs">
                              {renderPermissionText(
                                server.permissions?.[user.id] || 1
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {server.contributions?.[user.id] || 0}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(
                            server.joinDate[user.id] || user.createdAt
                          ).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 text-right text-sm text-gray-500 select-none">
              右鍵可以進行處理
            </div>
          </div>
        );

      case "訪問許可權":
        return (
          <div className="space-y-4">
            <div className="text-sm">
              <span className="font-medium">訪問許可權</span>
              <div className="mt-4 ml-8">
                <div className="flex items-center mb-6">
                  <input
                    type="radio"
                    id="public"
                    name="permission"
                    value="public"
                    className="mr-3"
                  />
                  <label htmlFor="public">公開群</label>
                </div>

                <div className="flex items-start mb-6">
                  <input
                    type="radio"
                    id="members"
                    name="permission"
                    value="members"
                    className="mr-3"
                  />
                  <div>
                    <label htmlFor="members">半公開群</label>
                    <div className="text-gray-500 text-xs mt-1">
                      (非會員只允許加入大廳)
                    </div>
                  </div>
                </div>

                <div className="flex items-start">
                  <input
                    type="radio"
                    id="private"
                    name="permission"
                    value="private"
                    className="mr-3"
                    defaultChecked
                  />
                  <div>
                    <label htmlFor="private">私密群</label>
                    <div className="text-gray-500 text-xs mt-1">
                      (該群只允許會員進入，不參與排行，只能通過ID搜索到)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "會員申請管理":
        return (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">最新申請</span>
              <button className="text-sm text-blue-400 hover:underline">
                申請設定
              </button>
            </div>
            <div className="grid grid-cols-3 text-sm bg-gray-100 border">
              <div className="p-2 border-r">暱稱</div>
              <div className="p-2 border-r">貢獻值</div>
              <div className="p-2">申請說明</div>
            </div>

            <div className="flex-1 border-x border-b overflow-auto">
              {Object.entries(server.applications || {}).map(
                ([userId, message]) => {
                  const applicantUser = users[userId];
                  const displayName =
                    server.nicknames[userId] ||
                    (applicantUser?.name ?? "未知用戶");

                  return (
                    <div key={userId} className="grid grid-cols-3 border-b">
                      <div className="p-2 border-r">{displayName}</div>
                      <div className="p-2 border-r">
                        {server.contributions[userId] || 0}
                      </div>
                      <div className="p-2">{message}</div>
                    </div>
                  );
                }
              )}
            </div>

            <div className="mt-2 text-sm text-gray-500">右鍵可以進行處理</div>
          </div>
        );

      default:
        return <div>{activeTab}</div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="flex flex-col w-[800] h-[700] bg-white rounded shadow-lg overflow-hidden transform outline-g">
        <div className="bg-blue-600 p-2 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="/rc_logo_small.png" alt="Logo" className="w-5 h-5" />
            <span>{server.name}</span>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-40 bg-blue-50 text-sm">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className={`cursor-pointer rounded transition-colors select-none px-4 py-1 ${
                  activeTab === item.id
                    ? "bg-blue-100 font-bold"
                    : "hover:bg-blue-100/50"
                }`}
                onClick={() => setActiveTab(item.id as TabType)}
              >
                {item.label}
              </div>
            ))}
          </div>

          <div className="flex-1 p-6">{renderContent()}</div>
        </div>

        <div className="flex justify-end gap-2 p-4 bg-gray-50">
          <button
            className="px-6 py-0 bg-white rounded hover:bg-gray-300 border border-black-200"
            onClick={onClose}
          >
            保存
          </button>
          <button
            className="px-6 py-1 bg-white rounded hover:bg-gray-300 border border-black-200"
            onClick={onClose}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingPage;
