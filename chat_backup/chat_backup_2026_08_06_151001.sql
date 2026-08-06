-- Acme HRMS Chat Backup
-- Generated at 2026-08-06 15:10:01

-- 
-- Table structure for chats
-- 
CREATE TABLE public.chats (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "type" character varying(20) NOT NULL,
    "name" character varying(255),
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "group_avatar" character varying(500),
    "permissions" jsonb DEFAULT '{"addMembers": true, "editSettings": true, "sendMessages": true, "approveNewMembers": false}'::jsonb,
    "admin_ids" jsonb DEFAULT '[]'::jsonb,
    "pending_participants" jsonb DEFAULT '[]'::jsonb,
    PRIMARY KEY ("id")
);

-- 
-- Data for chats
-- 
INSERT INTO public.chats ("id", "type", "name", "createdAt", "group_avatar", "permissions", "admin_ids", "pending_participants") VALUES ('70bc23d3-62d8-472f-9ee4-14ac9a8009d1', 'personal', NULL, '2026-07-14 10:29:19.321142', NULL, '{"addMembers": true, "editSettings": true, "sendMessages": true, "approveNewMembers": false}', '["2d090530-ebf3-4e75-bb8f-99dbdaf840e7"]', '[]');
INSERT INTO public.chats ("id", "type", "name", "createdAt", "group_avatar", "permissions", "admin_ids", "pending_participants") VALUES ('f2e346c2-badb-4fd8-be9e-1190450a5ce9', 'group', 'Acme Group', '2026-08-01 18:48:57.702935', 'https://hrms-qwv3.onrender.com/Chat-Attachment/groups/ttyplx3s1g.jpeg', '{"addMembers": true, "editSettings": true, "sendMessages": true, "approveNewMembers": true}', '["2d090530-ebf3-4e75-bb8f-99dbdaf840e7", "7434943a-3711-4a08-abf6-0e948c5c08f6"]', '[]');


-- 
-- Table structure for chat_participants
-- 
CREATE TABLE public.chat_participants (
    "chatId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "joinedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("chatId", "userId")
);

-- 
-- Data for chat_participants
-- 
INSERT INTO public.chat_participants ("chatId", "userId", "joinedAt") VALUES ('70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '7434943a-3711-4a08-abf6-0e948c5c08f6', '2026-07-14 10:29:19.321142');
INSERT INTO public.chat_participants ("chatId", "userId", "joinedAt") VALUES ('70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '2d090530-ebf3-4e75-bb8f-99dbdaf840e7', '2026-07-14 10:29:19.321142');
INSERT INTO public.chat_participants ("chatId", "userId", "joinedAt") VALUES ('f2e346c2-badb-4fd8-be9e-1190450a5ce9', '7434943a-3711-4a08-abf6-0e948c5c08f6', '2026-08-01 18:48:57.702935');
INSERT INTO public.chat_participants ("chatId", "userId", "joinedAt") VALUES ('f2e346c2-badb-4fd8-be9e-1190450a5ce9', '2d090530-ebf3-4e75-bb8f-99dbdaf840e7', '2026-08-01 18:48:57.702935');


-- 
-- Table structure for chat_messages
-- 
CREATE TABLE public.chat_messages (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "chatId" uuid,
    "senderId" uuid,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "deliveredTo" jsonb DEFAULT '[]'::jsonb,
    "readBy" jsonb DEFAULT '[]'::jsonb,
    "content" text,
    "attachmentUrl" character varying(500),
    "attachmentType" character varying(50),
    "attachmentName" character varying(255),
    "attachmentSize" integer,
    "isSystemMessage" boolean DEFAULT false,
    PRIMARY KEY ("id")
);

-- 
-- Data for chat_messages
-- 
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('a5010809-6624-4e16-9e8d-b406306a0997', '70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '2d090530-ebf3-4e75-bb8f-99dbdaf840e7', '2026-08-01 18:17:08.493568', '[]', '["7434943a-3711-4a08-abf6-0e948c5c08f6"]', 'YORXvIGlJ3VCXylTLQa3OPoodDNwkc4210Jp6czF63A=', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('107633d3-30f2-474c-b47d-ea7cb5551e38', '70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '2d090530-ebf3-4e75-bb8f-99dbdaf840e7', '2026-07-14 10:29:27.702277', '[]', '["7434943a-3711-4a08-abf6-0e948c5c08f6"]', 's4UFfj3Xay/5buHuXbFLW/+JobatwIRRNKw/jkoRU+bdCQHQ5mvy', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('64c9eca3-0d3a-40c4-bba1-c75b052bf017', '70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '7434943a-3711-4a08-abf6-0e948c5c08f6', '2026-07-14 10:29:41.700217', '[]', '["2d090530-ebf3-4e75-bb8f-99dbdaf840e7"]', 'YmCTji4zOuPM2HoDp896O80KmQE2y3Q+m1Y1+FBcOzLriXAyz3RsS6o=', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('afd6769b-e90a-4f97-9e27-a1da2e04c695', '70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '2d090530-ebf3-4e75-bb8f-99dbdaf840e7', '2026-07-15 14:15:14.829597', '[]', '["7434943a-3711-4a08-abf6-0e948c5c08f6"]', 'rsn+F8SawW1aUyX2siwzS88OcZ5EMjxMor5vBEGktm9J', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('45a52b0e-9beb-4eea-a6cc-f9de80238f90', '70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '2d090530-ebf3-4e75-bb8f-99dbdaf840e7', '2026-07-17 15:11:40.844094', '[]', '["7434943a-3711-4a08-abf6-0e948c5c08f6"]', 'occY5lE1B9YANGqTGTSuTxC16MSKVHWHY9PtjMfDU5k=', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('b18f0c9d-14f1-46d6-b7b3-7cfce56e1b60', '70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '2d090530-ebf3-4e75-bb8f-99dbdaf840e7', '2026-07-14 10:30:36.131322', '[]', '["7434943a-3711-4a08-abf6-0e948c5c08f6"]', '2yvgTtxigL+nmVINRNJ2TdCISBO8PmJsb4/uSoJfdPg=', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('e9de393f-1079-4554-86ee-79094f3fff17', '70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '2d090530-ebf3-4e75-bb8f-99dbdaf840e7', '2026-07-24 18:23:00.837039', '[]', '["7434943a-3711-4a08-abf6-0e948c5c08f6"]', 'SW+0Y+q2emzkNI2FpYfaPS6iEHLME8a8az5aaQf4RhSo', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('c851ffd0-2638-4028-b031-b1530dff1eac', '70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '2d090530-ebf3-4e75-bb8f-99dbdaf840e7', '2026-07-24 18:28:47.319348', '[]', '["7434943a-3711-4a08-abf6-0e948c5c08f6"]', 'DfqeoDw9lSfEsf/CNLJf3jiLDIB37bbqtQh9S4D+', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('64fbc955-01c6-41c2-a46f-4d1f4e7f0b98', '70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '2d090530-ebf3-4e75-bb8f-99dbdaf840e7', '2026-07-14 10:30:52.25964', '[]', '["7434943a-3711-4a08-abf6-0e948c5c08f6"]', '8ikxiprUo3AKm06SIdsCTtBKmpqhx0fKGXnDYUmoIBM/e2Y=', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('d0781201-680a-4017-9454-d83b6004ab76', '70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '2d090530-ebf3-4e75-bb8f-99dbdaf840e7', '2026-07-14 10:31:07.856393', '[]', '["7434943a-3711-4a08-abf6-0e948c5c08f6"]', 'NHhAF8/fwL6QtQx4LTH5Drg2bXDbpzRn0vodhkzjMiU=', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('ac92d4bd-1f74-4bb8-8764-f0c9804094da', '70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '2d090530-ebf3-4e75-bb8f-99dbdaf840e7', '2026-07-25 23:31:29.744472', '[]', '["7434943a-3711-4a08-abf6-0e948c5c08f6"]', '1rydeLRD6s104BLI48Zekkn2iSGXpVWnRvuUsyq8gv8=', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('16f9791a-eb90-414b-91ae-a58a213a01f4', '70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '2d090530-ebf3-4e75-bb8f-99dbdaf840e7', '2026-08-01 13:23:07.434357', '[]', '["7434943a-3711-4a08-abf6-0e948c5c08f6"]', 'r8G6v+duMKesCgn2xYiltZlvu9PRh140StJf9oRo61d+', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('cef5180a-c0e3-4ca2-9f86-884972bde193', '70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '2d090530-ebf3-4e75-bb8f-99dbdaf840e7', '2026-08-02 14:31:45.456539', '[]', '["7434943a-3711-4a08-abf6-0e948c5c08f6"]', 'G9mVNsovQ5hHl/PLVynixnifGmmUqy5d59n4xUXhHu8=', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('79975feb-2f00-4438-99d2-ac60b704fa5a', '70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '2d090530-ebf3-4e75-bb8f-99dbdaf840e7', '2026-08-01 13:23:26.357005', '[]', '["7434943a-3711-4a08-abf6-0e948c5c08f6"]', 'Xcx5wgcpqK3LceVTYyLgp5NhdIXm4EzLoJ7zJ88Eb/s=', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('a5777829-de2c-4fda-ad17-0b011e039351', '70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '7434943a-3711-4a08-abf6-0e948c5c08f6', '2026-07-24 18:23:33.923907', '[]', '["2d090530-ebf3-4e75-bb8f-99dbdaf840e7"]', 'r76VvxrDh0JtGdxsZzUt8ihQ8kexaZrSJ+LGDEc4FUmf', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('5997ef83-d904-47f2-ad78-114e4c4002ad', '70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '7434943a-3711-4a08-abf6-0e948c5c08f6', '2026-07-24 18:23:49.797183', '[]', '["2d090530-ebf3-4e75-bb8f-99dbdaf840e7"]', 'UMi3pLcoCUpy6FKy359sctfiX+p+lzKgByZuWpqqgQ==', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('31e74b93-eb99-45e4-9b7d-e466d2bd693f', '70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '2d090530-ebf3-4e75-bb8f-99dbdaf840e7', '2026-08-02 14:31:50.023653', '[]', '["7434943a-3711-4a08-abf6-0e948c5c08f6"]', 'YbsywGHXGNVeGvxb4TLnDMgvDJIGAl1YcDCbrpb4YqQ=', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('bcf5d3cd-43ed-47e4-b8c9-194ca302c10a', '70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '2d090530-ebf3-4e75-bb8f-99dbdaf840e7', '2026-08-02 14:31:55.323841', '[]', '["7434943a-3711-4a08-abf6-0e948c5c08f6"]', '9/7s25P9By2lrvqwcbgGSZaGofVG4vFu7EpHUzkTHQZ2YkZdJA==', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('085ed4ac-a6b4-4b6e-a9ba-8f2a044ff117', '70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '7434943a-3711-4a08-abf6-0e948c5c08f6', '2026-08-01 13:24:17.464775', '[]', '["2d090530-ebf3-4e75-bb8f-99dbdaf840e7"]', 'WSfQJ2JGM8LbavVw8CSQXHX9yoQVl58+1bJtm/EdcFcdjFsh', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('c0be9811-ec1e-487c-b522-9718fd864916', '70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '2d090530-ebf3-4e75-bb8f-99dbdaf840e7', '2026-08-02 14:32:16.221274', '[]', '["7434943a-3711-4a08-abf6-0e948c5c08f6"]', 'w0H/Xyx9Jg6yAhDtm05pZM8a+x2TCSJncIaApxGJ0+k=', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('f4400ed5-5878-46a7-bd20-fde3fafc7f91', 'f2e346c2-badb-4fd8-be9e-1190450a5ce9', '2d090530-ebf3-4e75-bb8f-99dbdaf840e7', '2026-08-01 20:19:37.481223', '[]', '["7434943a-3711-4a08-abf6-0e948c5c08f6"]', 'GbJg8t/sCel1FQVuOufcdepIwZ0TGO4enlEb82ADsQ==', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('5f2c29c9-887d-4c3f-a16e-c41350c096b7', 'f2e346c2-badb-4fd8-be9e-1190450a5ce9', '2d090530-ebf3-4e75-bb8f-99dbdaf840e7', '2026-08-02 07:48:36.209821', '[]', '["7434943a-3711-4a08-abf6-0e948c5c08f6"]', 'QmUBMdVb6urpxSYwpCa0CwgnrU9TyeuREyit4cWA', NULL, NULL, NULL, NULL, '');
INSERT INTO public.chat_messages ("id", "chatId", "senderId", "createdAt", "deliveredTo", "readBy", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "isSystemMessage") VALUES ('85a77dce-3152-4fd4-bcac-2606a4358d85', '70bc23d3-62d8-472f-9ee4-14ac9a8009d1', '2d090530-ebf3-4e75-bb8f-99dbdaf840e7', '2026-08-02 15:20:07.126544', '[]', '["7434943a-3711-4a08-abf6-0e948c5c08f6"]', '4hfnp4iF/UNt+kgWkiUmdP/DF61Xwm2k6LzBlA==', 'https://hrms-qwv3.onrender.com/Chat-Attachment/2d090530-ebf3-4e75-bb8f-99dbdaf840e7/ok7rw1ml19.pdf', 'application/pdf', 'Gowtham_Chowdary_Dev.pdf', '132986', '');


