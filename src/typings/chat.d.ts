declare namespace Chat {

	interface Chat {
		//时间
		dateTime: string
		//对话内容 imgUrl
		text: string
		taskId?:string
		prompt?:string
		imgId?:string
		isBigger?:boolean
		inversion?: boolean
		error?: boolean
		form?:IDrawForm
		//正在获取 imgUrl
		loading?: boolean
		progress?:number
		conversationOptions?: ConversationRequest | null
		requestOptions?: { prompt: string; options?: ConversationRequest | null }
	}

	interface IDrawForm{
		prompt:string
		imgSize:string
		imgVersion:string
		promptReverse:string
		customSize:string
		weight?:number
		upImgUrl:string
	}
	interface History {
		title: string
		isEdit: boolean
		uuid: number
		type: number
	}

	interface ChatState {
		active: number | null
		history: History[]
		chat: { uuid: number; data: Chat[] }[]
		type :number
	}

	interface ConversationRequest {
		conversationId?: string
		parentMessageId?: string
	}

	interface ConversationResponse {
		conversationId: string
		detail: {
			choices: { finish_reason: string; index: number; logprobs: any; text: string }[]
			created: number
			id: string
			model: string
			object: string
			usage: { completion_tokens: number; prompt_tokens: number; total_tokens: number }
		}
		id: string
		parentMessageId: string
		role: string
		text: string
	}
}
