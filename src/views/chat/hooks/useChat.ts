import { useChatStore } from '@/store'

export function useChat() {
  const chatStore = useChatStore()

  const getTypeByUuidAndIndex = (uuid: number, index: number) => {
    return chatStore.getTypeByUuidAndIndex(uuid, index)
  }

  const getChatByUuidAndIndex = (uuid: number, index: number) => {
    return chatStore.getChatByUuidAndIndex(uuid, index)
  }

  const addChat = (uuid: number, chat: Chat.Chat) => {
    chatStore.addChatByUuid(uuid, chat)
  }
  const addDraw = (uuid: number, chat: Chat.Chat) => {
    chatStore.addDrawByUuid(uuid, chat)
  }

  const updateChat = (uuid: number, index: number, chat: Chat.Chat) => {
    chatStore.updateChatByUuid(uuid, index, chat)
  }
  const updateDraw = (uuid: number, index: number, chat: Chat.Chat) => {
    chatStore.updateDrawByUuid(uuid, index, chat)
  }

  const updateChatSome = (uuid: number, index: number, chat: Partial<Chat.Chat>) => {
    chatStore.updateChatSomeByUuid(uuid, index, chat)
  }
  const deleteDraw = (uuid: number, index: number) => {
    chatStore.deleteDrawByUuid(uuid, index)
  }
  const upFirst = (uuid: number, index: number) => {
    chatStore.upFirstDraw(uuid, index)
  }

  return {
    upFirst,
    addDraw,
    addChat,
    updateChat,
    updateDraw,
    updateChatSome,
    deleteDraw,
    getChatByUuidAndIndex,
    getTypeByUuidAndIndex,
  }
}
