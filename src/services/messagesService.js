/**
 * src/services/messagesService.js
 *
 * API wrappers for the /messages endpoints.
 *
 * Note: sending new messages is done via WebSocket (not HTTP), so there
 * is no "sendMessage" function here. This file covers HTTP-only operations:
 * editing and deleting existing messages.
 */

import api from './api'

/**
 * PUT /messages/{message_id}
 *
 * Edit a message's content. Returns the updated MessageResponse.
 * After calling this, the backend broadcasts an "edit" WS frame to all
 * connected clients in the channel — so the UI updates automatically.
 *
 * @param {string} messageId  UUID of the message to edit
 * @param {string} content    New content (1–2000 chars)
 * @returns {Promise<object>} Updated message object
 */
export async function editMessage(messageId, content) {
  const response = await api.put(`/messages/${messageId}`, { content })
  return response.data
}

/**
 * DELETE /messages/{message_id}
 *
 * Soft-delete a message. Returns { message: string, id: string }.
 * After calling this, the backend broadcasts a "delete" WS frame to all
 * connected clients in the channel — so the UI removes it automatically.
 *
 * @param {string} messageId  UUID of the message to delete
 * @returns {Promise<object>} Confirmation object
 */
export async function deleteMessage(messageId) {
  const response = await api.delete(`/messages/${messageId}`)
  return response.data
}
