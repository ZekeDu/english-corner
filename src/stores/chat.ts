import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

export interface Conversation {
  id: number;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  sendMessage: (message: string, conversationId?: number) => Promise<void>;
  loadConversations: () => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
  createNewConversation: () => void;
  deleteConversation: (id: number) => Promise<void>;
  clearAllConversations: () => Promise<void>;
  searchConversations: (query: string) => Conversation[];
  clearError: () => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      (set, get) => ({
        conversations: [],
        activeConversation: null,
        isLoading: false,
        error: null,

        sendMessage: async (message: string, conversationId?: number) => {
          set({ isLoading: true, error: null });
          
          try {
            // 立即添加用户消息到对话
            const userMessage = {
              id: Date.now().toString(),
              content: message,
              role: 'user' as const,
              timestamp: new Date().toISOString()
            };

            // 获取当前对话状态
            const { activeConversation } = get();
            let currentConversation = activeConversation;

            // 如果是新对话，创建临时对话
            if (!conversationId) {
              const tempConversation: Conversation = {
                id: Date.now(),
                title: message.substring(0, 20) + '...',
                messages: [userMessage],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              
              set((state) => ({
                conversations: [tempConversation, ...state.conversations],
                activeConversation: tempConversation,
              }));
              
              currentConversation = tempConversation;
            } else {
              // 更新现有对话，添加用户消息
              const updatedMessages = [...(currentConversation?.messages || []), userMessage];
              const updatedConversation = {
                ...currentConversation!,
                messages: updatedMessages,
                updatedAt: new Date().toISOString()
              };
              
              set((state) => ({
                conversations: state.conversations.map(conv =>
                  conv.id === conversationId ? updatedConversation : conv
                ),
                activeConversation: updatedConversation,
              }));
              
              currentConversation = updatedConversation;
            }

            // 创建流式请求
            const response = await fetch('/api/chat/stream', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message,
                conversationId,
              }),
            });

            if (!response.ok) {
              throw new Error('发送失败');
            }

            const reader = response.body?.getReader();
            if (!reader) {
              throw new Error('无法读取流');
            }

            const decoder = new TextDecoder();
            let aiReply = '';
            let conversationInfo: any = null;

            // 读取流式数据 - 使用正确的SSE解析
            let buffer = '';
            const streamingMessageId = Date.now().toString() + '_streaming';
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              
              // 处理完整的SSE事件
              const lines = buffer.split('\n');
              buffer = lines.pop() || ''; // 保留不完整的数据
              
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    
                    if (data.type === 'start') {
                      conversationInfo = data.conversation;
                    } else if (data.type === 'chunk') {
                      aiReply += data.content;
                      
                      // 创建或更新流式消息
                      const streamingMessage = {
                        id: streamingMessageId,
                        content: aiReply,
                        role: 'assistant' as const,
                        timestamp: new Date().toISOString()
                      };
                      
                      // 获取当前消息列表（不包含之前添加的临时消息）
                      const messages = [...(currentConversation?.messages || [])];
                      
                      // 检查是否已存在流式消息
                      const existingIndex = messages.findIndex(msg => msg.id === streamingMessageId);
                      if (existingIndex >= 0) {
                        messages[existingIndex] = streamingMessage;
                      } else {
                        messages.push(streamingMessage);
                      }
                      
                      const updatedConversation = {
                        ...(conversationInfo || currentConversation),
                        messages,
                        updatedAt: new Date().toISOString()
                      };
                      
                      set((state) => ({
                        conversations: state.conversations.map(conv =>
                          conv.id === updatedConversation.id ? updatedConversation : conv
                        ),
                        activeConversation: updatedConversation,
                      }));
                    } else if (data.type === 'done') {
                      // 用最终消息替换流式消息
                      const finalMessage = {
                        id: Date.now().toString(),
                        content: aiReply,
                        role: 'assistant' as const,
                        timestamp: new Date().toISOString()
                      };
                      
                      const messages = [...(currentConversation?.messages || [])];
                      const streamingIndex = messages.findIndex(msg => msg.id === streamingMessageId);
                      
                      if (streamingIndex >= 0) {
                        messages[streamingIndex] = finalMessage;
                      } else {
                        messages.push(finalMessage);
                      }
                      
                      const finalConversation = {
                        ...(conversationInfo || currentConversation),
                        messages,
                        updatedAt: new Date().toISOString()
                      };
                      
                      set((state) => ({
                        conversations: state.conversations.map(conv =>
                          conv.id === finalConversation.id ? finalConversation : conv
                        ),
                        activeConversation: finalConversation,
                      }));
                    } else if (data.type === 'error') {
                      throw new Error(data.error);
                    }
                  } catch (e) {
                    console.warn('Failed to parse SSE data:', e);
                  }
                }
              }
            }
          } catch (error) {
            set({ error: error instanceof Error ? error.message : '发送失败' });
          } finally {
            set({ isLoading: false });
          }
        },

        loadConversations: async () => {
          try {
            const response = await fetch('/api/chat/conversations');
            if (!response.ok) throw new Error('加载失败');
            
            const conversations = await response.json();
            // 将API响应格式转换为store格式
            const formattedConversations = conversations.map((conv: any) => ({
              id: conv.id,
              title: conv.title,
              messages: Array.isArray(conv.messages) ? conv.messages.map((msg: any) => ({
                ...msg,
                timestamp: typeof msg.timestamp === 'string' ? msg.timestamp : new Date().toISOString()
              })) : [],
              createdAt: typeof conv.createdAt === 'string' ? conv.createdAt : conv.createdAt?.toISOString() || new Date().toISOString(),
              updatedAt: typeof conv.updatedAt === 'string' ? conv.updatedAt : conv.updatedAt?.toISOString() || new Date().toISOString(),
            }));
            set({ conversations: formattedConversations });
          } catch (error) {
            set({ error: error instanceof Error ? error.message : '加载对话失败' });
          }
        },

        setActiveConversation: (conversation) => {
          set({ activeConversation: conversation });
        },

        createNewConversation: () => {
          set({ activeConversation: null });
        },

        deleteConversation: async (id: number) => {
          try {
            const response = await fetch(`/api/chat/conversations/${id}`, {
              method: 'DELETE',
            });

            if (!response.ok) throw new Error('删除失败');

            set((state) => ({
              conversations: state.conversations.filter(conv => conv.id !== id),
              activeConversation:
                state.activeConversation?.id === id
                  ? null
                  : state.activeConversation,
            }));
          } catch {
            set({ error: '删除失败' });
          }
        },

        clearAllConversations: async () => {
          try {
            set({ isLoading: true, error: null });
            
            const response = await fetch('/api/chat/conversations/clear', {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ confirm: true }),
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || '清空失败');
            }

            set({
              conversations: [],
              activeConversation: null,
              isLoading: false,
            });

            const data = await response.json();
            return data.deletedCount;
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : '清空失败',
              isLoading: false 
            });
            throw error;
          }
        },

        searchConversations: (query: string) => {
          const { conversations } = get();
          if (!query.trim()) return conversations;
          
          return conversations.filter(conv =>
            conv.title.toLowerCase().includes(query.toLowerCase()) ||
            conv.messages.some(msg =>
              msg.content.toLowerCase().includes(query.toLowerCase())
            )
          );
        },

        clearError: () => set({ error: null }),
      }),
      {
        name: 'chat-storage',
        partialize: (state) => ({
          conversations: state.conversations,
          activeConversation: state.activeConversation,
        }),
      }
    )
  )
);