// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  if (mod && typeof mod === "object" || typeof mod === "function") {
    for (let key of __getOwnPropNames(mod))
      if (!__hasOwnProp.call(to, key))
        __defProp(to, key, {
          get: __accessProp.bind(mod, key),
          enumerable: true
        });
  }
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __toCommonJS = (from) => {
  var entry = (__moduleCache ??= new WeakMap).get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function") {
    for (var key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(entry, key))
        __defProp(entry, key, {
          get: __accessProp.bind(from, key),
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
  }
  __moduleCache.set(from, entry);
  return entry;
};
var __moduleCache;
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = import.meta.require;

// node_modules/grammy/out/filter.js
var require_filter = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.matchFilter = matchFilter;
  exports.parse = parse;
  exports.preprocess = preprocess;
  var filterQueryCache = new Map;
  function matchFilter(filter) {
    var _a;
    const queries = Array.isArray(filter) ? filter : [filter];
    const key = queries.join(",");
    const predicate = (_a = filterQueryCache.get(key)) !== null && _a !== undefined ? _a : (() => {
      const parsed = parse(queries);
      const pred = compile(parsed);
      filterQueryCache.set(key, pred);
      return pred;
    })();
    return (ctx) => predicate(ctx);
  }
  function parse(filter) {
    return Array.isArray(filter) ? filter.map((q) => q.split(":")) : [filter.split(":")];
  }
  function compile(parsed) {
    const preprocessed = parsed.flatMap((q) => check(q, preprocess(q)));
    const ltree = treeify(preprocessed);
    const predicate = arborist(ltree);
    return (ctx) => !!predicate(ctx.update, ctx);
  }
  function preprocess(filter) {
    const valid = UPDATE_KEYS;
    const expanded = [filter].flatMap((q) => {
      const [l1, l2, l3] = q;
      if (!(l1 in L1_SHORTCUTS))
        return [q];
      if (!l1 && !l2 && !l3)
        return [q];
      const targets = L1_SHORTCUTS[l1];
      const expanded2 = targets.map((s) => [s, l2, l3]);
      if (l2 === undefined)
        return expanded2;
      if (l2 in L2_SHORTCUTS && (l2 || l3))
        return expanded2;
      return expanded2.filter(([s]) => {
        var _a;
        return !!((_a = valid[s]) === null || _a === undefined ? undefined : _a[l2]);
      });
    }).flatMap((q) => {
      const [l1, l2, l3] = q;
      if (!(l2 in L2_SHORTCUTS))
        return [q];
      if (!l2 && !l3)
        return [q];
      const targets = L2_SHORTCUTS[l2];
      const expanded2 = targets.map((s) => [l1, s, l3]);
      if (l3 === undefined)
        return expanded2;
      return expanded2.filter(([, s]) => {
        var _a, _b;
        return !!((_b = (_a = valid[l1]) === null || _a === undefined ? undefined : _a[s]) === null || _b === undefined ? undefined : _b[l3]);
      });
    });
    if (expanded.length === 0) {
      throw new Error(`Shortcuts in '${filter.join(":")}' do not expand to any valid filter query`);
    }
    return expanded;
  }
  function check(original, preprocessed) {
    if (preprocessed.length === 0)
      throw new Error("Empty filter query given");
    const errors = preprocessed.map(checkOne).filter((r) => r !== true);
    if (errors.length === 0)
      return preprocessed;
    else if (errors.length === 1)
      throw new Error(errors[0]);
    else {
      throw new Error(`Invalid filter query '${original.join(":")}'. There are ${errors.length} errors after expanding the contained shortcuts: ${errors.join("; ")}`);
    }
  }
  function checkOne(filter) {
    const [l1, l2, l3, ...n] = filter;
    if (l1 === undefined)
      return "Empty filter query given";
    if (!(l1 in UPDATE_KEYS)) {
      const permitted = Object.keys(UPDATE_KEYS);
      return `Invalid L1 filter '${l1}' given in '${filter.join(":")}'. Permitted values are: ${permitted.map((k) => `'${k}'`).join(", ")}.`;
    }
    if (l2 === undefined)
      return true;
    const l1Obj = UPDATE_KEYS[l1];
    if (!(l2 in l1Obj)) {
      const permitted = Object.keys(l1Obj);
      return `Invalid L2 filter '${l2}' given in '${filter.join(":")}'. Permitted values are: ${permitted.map((k) => `'${k}'`).join(", ")}.`;
    }
    if (l3 === undefined)
      return true;
    const l2Obj = l1Obj[l2];
    if (!(l3 in l2Obj)) {
      const permitted = Object.keys(l2Obj);
      return `Invalid L3 filter '${l3}' given in '${filter.join(":")}'. ${permitted.length === 0 ? `No further filtering is possible after '${l1}:${l2}'.` : `Permitted values are: ${permitted.map((k) => `'${k}'`).join(", ")}.`}`;
    }
    if (n.length === 0)
      return true;
    return `Cannot filter further than three levels, ':${n.join(":")}' is invalid!`;
  }
  function treeify(paths) {
    var _a, _b;
    const tree = {};
    for (const [l1, l2, l3] of paths) {
      const subtree = (_a = tree[l1]) !== null && _a !== undefined ? _a : tree[l1] = {};
      if (l2 !== undefined) {
        const set = (_b = subtree[l2]) !== null && _b !== undefined ? _b : subtree[l2] = new Set;
        if (l3 !== undefined)
          set.add(l3);
      }
    }
    return tree;
  }
  function or(left, right) {
    return (obj, ctx) => left(obj, ctx) || right(obj, ctx);
  }
  function concat(get, test) {
    return (obj, ctx) => {
      const nextObj = get(obj, ctx);
      return nextObj && test(nextObj, ctx);
    };
  }
  function leaf(pred) {
    return (obj, ctx) => pred(obj, ctx) != null;
  }
  function arborist(tree) {
    const l1Predicates = Object.entries(tree).map(([l1, subtree]) => {
      const l1Pred = (obj) => obj[l1];
      const l2Predicates = Object.entries(subtree).map(([l2, set]) => {
        const l2Pred = (obj) => obj[l2];
        const l3Predicates = Array.from(set).map((l3) => {
          const l3Pred = l3 === "me" ? (obj, ctx) => {
            const me = ctx.me.id;
            return testMaybeArray(obj, (u) => u.id === me);
          } : (obj) => testMaybeArray(obj, (e) => e[l3] || e.type === l3);
          return l3Pred;
        });
        return l3Predicates.length === 0 ? leaf(l2Pred) : concat(l2Pred, l3Predicates.reduce(or));
      });
      return l2Predicates.length === 0 ? leaf(l1Pred) : concat(l1Pred, l2Predicates.reduce(or));
    });
    if (l1Predicates.length === 0) {
      throw new Error("Cannot create filter function for empty query");
    }
    return l1Predicates.reduce(or);
  }
  function testMaybeArray(t, pred) {
    const p = (x) => x != null && pred(x);
    return Array.isArray(t) ? t.some(p) : p(t);
  }
  var ENTITY_KEYS = {
    mention: {},
    hashtag: {},
    cashtag: {},
    bot_command: {},
    url: {},
    email: {},
    phone_number: {},
    bold: {},
    italic: {},
    underline: {},
    strikethrough: {},
    spoiler: {},
    blockquote: {},
    expandable_blockquote: {},
    code: {},
    pre: {},
    text_link: {},
    text_mention: {},
    custom_emoji: {},
    date_time: {}
  };
  var USER_KEYS = {
    me: {},
    is_bot: {},
    is_premium: {},
    added_to_attachment_menu: {}
  };
  var FORWARD_ORIGIN_KEYS = {
    user: {},
    hidden_user: {},
    chat: {},
    channel: {}
  };
  var STICKER_KEYS = {
    is_video: {},
    is_animated: {},
    premium_animation: {}
  };
  var REACTION_KEYS = {
    emoji: {},
    custom_emoji: {},
    paid: {}
  };
  var GIFT_INFO_KEYS = {
    can_be_upgraded: {},
    is_upgrade_separate: {},
    is_private: {}
  };
  var COMMON_MESSAGE_KEYS = {
    forward_origin: FORWARD_ORIGIN_KEYS,
    is_topic_message: {},
    is_automatic_forward: {},
    guest_query_id: {},
    business_connection_id: {},
    text: {},
    rich_message: {},
    animation: {},
    audio: {},
    document: {},
    live_photo: {},
    paid_media: {},
    photo: {},
    sticker: STICKER_KEYS,
    story: {},
    video: {},
    video_note: {},
    voice: {},
    contact: {},
    dice: {},
    game: {},
    poll: {},
    venue: {},
    location: {},
    entities: ENTITY_KEYS,
    caption_entities: ENTITY_KEYS,
    caption: {},
    link_preview_options: {
      url: {},
      prefer_small_media: {},
      prefer_large_media: {},
      show_above_text: {}
    },
    effect_id: {},
    paid_star_count: {},
    has_media_spoiler: {},
    new_chat_title: {},
    new_chat_photo: {},
    delete_chat_photo: {},
    message_auto_delete_timer_changed: {},
    pinned_message: {},
    invoice: {},
    proximity_alert_triggered: {},
    chat_background_set: {},
    giveaway_created: {},
    giveaway: { only_new_members: {}, has_public_winners: {} },
    giveaway_winners: { only_new_members: {}, was_refunded: {} },
    giveaway_completed: {},
    gift: GIFT_INFO_KEYS,
    gift_upgrade_sent: GIFT_INFO_KEYS,
    unique_gift: { transfer_star_count: {}, text: {}, is_private: {} },
    paid_message_price_changed: {},
    video_chat_scheduled: {},
    video_chat_started: {},
    video_chat_ended: {},
    video_chat_participants_invited: {},
    web_app_data: {}
  };
  var MESSAGE_KEYS = {
    ...COMMON_MESSAGE_KEYS,
    direct_messages_topic: {},
    chat_owner_left: { new_owner: {} },
    chat_owner_changed: {},
    new_chat_members: USER_KEYS,
    community_chat_joined: {},
    left_chat_member: USER_KEYS,
    group_chat_created: {},
    supergroup_chat_created: {},
    migrate_to_chat_id: {},
    migrate_from_chat_id: {},
    successful_payment: {},
    refunded_payment: {},
    users_shared: {},
    chat_shared: {},
    connected_website: {},
    managed_bot_created: {},
    write_access_allowed: {},
    passport_data: {},
    boost_added: {},
    forum_topic_created: { is_name_implicit: {} },
    forum_topic_edited: { name: {}, icon_custom_emoji_id: {} },
    forum_topic_closed: {},
    forum_topic_reopened: {},
    general_forum_topic_hidden: {},
    general_forum_topic_unhidden: {},
    checklist: { others_can_add_tasks: {}, others_can_mark_tasks_as_done: {} },
    checklist_tasks_done: {},
    checklist_tasks_added: {},
    community_chat_added: {},
    community_chat_removed: {},
    poll_option_added: {},
    poll_option_deleted: {},
    suggested_post_info: {},
    suggested_post_approved: {},
    suggested_post_approval_failed: {},
    suggested_post_declined: {},
    suggested_post_paid: {},
    suggested_post_refunded: {},
    sender_boost_count: {}
  };
  var CHANNEL_POST_KEYS = {
    ...COMMON_MESSAGE_KEYS,
    channel_chat_created: {},
    direct_message_price_changed: {},
    is_paid_post: {}
  };
  var BUSINESS_CONNECTION_KEYS = {
    can_reply: {},
    is_enabled: {}
  };
  var MESSAGE_REACTION_KEYS = {
    old_reaction: REACTION_KEYS,
    new_reaction: REACTION_KEYS
  };
  var MESSAGE_REACTION_COUNT_UPDATED_KEYS = {
    reactions: REACTION_KEYS
  };
  var CALLBACK_QUERY_KEYS = { data: {}, game_short_name: {} };
  var CHAT_MEMBER_UPDATED_KEYS = { from: USER_KEYS };
  var UPDATE_KEYS = {
    message: MESSAGE_KEYS,
    edited_message: MESSAGE_KEYS,
    channel_post: CHANNEL_POST_KEYS,
    edited_channel_post: CHANNEL_POST_KEYS,
    business_connection: BUSINESS_CONNECTION_KEYS,
    business_message: MESSAGE_KEYS,
    edited_business_message: MESSAGE_KEYS,
    deleted_business_messages: {},
    guest_message: MESSAGE_KEYS,
    stopped_message_generation: {},
    inline_query: {},
    chosen_inline_result: {},
    callback_query: CALLBACK_QUERY_KEYS,
    shipping_query: {},
    pre_checkout_query: {},
    poll: {},
    poll_answer: {},
    my_chat_member: CHAT_MEMBER_UPDATED_KEYS,
    chat_member: CHAT_MEMBER_UPDATED_KEYS,
    managed_bot: {},
    chat_join_request: {},
    message_reaction: MESSAGE_REACTION_KEYS,
    message_reaction_count: MESSAGE_REACTION_COUNT_UPDATED_KEYS,
    chat_boost: {},
    removed_chat_boost: {},
    purchased_paid_media: {},
    subscription: { state: { canceled: {}, active: {}, failed: {} } }
  };
  var L1_SHORTCUTS = {
    "": ["message", "channel_post"],
    msg: ["message", "channel_post"],
    edit: ["edited_message", "edited_channel_post"]
  };
  var L2_SHORTCUTS = {
    "": ["entities", "caption_entities"],
    media: ["photo", "live_photo", "video"],
    file: [
      "photo",
      "live_photo",
      "animation",
      "audio",
      "document",
      "video",
      "video_note",
      "voice",
      "sticker"
    ]
  };
});

// node_modules/grammy/out/context.js
var require_context = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.Context = undefined;
  var filter_js_1 = require_filter();
  var checker = {
    filterQuery(filter) {
      const pred = (0, filter_js_1.matchFilter)(filter);
      return (ctx) => pred(ctx);
    },
    text(trigger) {
      const hasText = checker.filterQuery([":text", ":caption"]);
      const trg = triggerFn(trigger);
      return (ctx) => {
        var _a, _b;
        if (!hasText(ctx))
          return false;
        const msg = (_a = ctx.message) !== null && _a !== undefined ? _a : ctx.channelPost;
        const txt = (_b = msg.text) !== null && _b !== undefined ? _b : msg.caption;
        return match(ctx, txt, trg);
      };
    },
    command(command) {
      const hasEntities = checker.filterQuery(":entities:bot_command");
      const atCommands = new Set;
      const noAtCommands = new Set;
      toArray(command).forEach((cmd) => {
        if (cmd.startsWith("/")) {
          throw new Error(`Do not include '/' when registering command handlers (use '${cmd.substring(1)}' not '${cmd}')`);
        }
        const set = cmd.includes("@") ? atCommands : noAtCommands;
        set.add(cmd);
      });
      return (ctx) => {
        var _a, _b;
        if (!hasEntities(ctx))
          return false;
        const msg = (_a = ctx.message) !== null && _a !== undefined ? _a : ctx.channelPost;
        const txt = (_b = msg.text) !== null && _b !== undefined ? _b : msg.caption;
        return msg.entities.some((e) => {
          if (e.type !== "bot_command")
            return false;
          if (e.offset !== 0)
            return false;
          const cmd = txt.substring(1, e.length);
          if (noAtCommands.has(cmd) || atCommands.has(cmd)) {
            ctx.match = txt.substring(cmd.length + 1).trimStart();
            return true;
          }
          const index = cmd.indexOf("@");
          if (index === -1)
            return false;
          const atTarget = cmd.substring(index + 1).toLowerCase();
          const username = ctx.me.username.toLowerCase();
          if (atTarget !== username)
            return false;
          const atCommand = cmd.substring(0, index);
          if (noAtCommands.has(atCommand)) {
            ctx.match = txt.substring(cmd.length + 1).trimStart();
            return true;
          }
          return false;
        });
      };
    },
    reaction(reaction) {
      const hasMessageReaction = checker.filterQuery("message_reaction");
      const normalized = typeof reaction === "string" ? [{ type: "emoji", emoji: reaction }] : (Array.isArray(reaction) ? reaction : [reaction]).map((emoji2) => typeof emoji2 === "string" ? { type: "emoji", emoji: emoji2 } : emoji2);
      const emoji = new Set(normalized.filter((r) => r.type === "emoji").map((r) => r.emoji));
      const customEmoji = new Set(normalized.filter((r) => r.type === "custom_emoji").map((r) => r.custom_emoji_id));
      const paid = normalized.some((r) => r.type === "paid");
      return (ctx) => {
        if (!hasMessageReaction(ctx))
          return false;
        const { old_reaction, new_reaction } = ctx.messageReaction;
        for (const reaction2 of new_reaction) {
          let isOld = false;
          if (reaction2.type === "emoji") {
            for (const old of old_reaction) {
              if (old.type !== "emoji")
                continue;
              if (old.emoji === reaction2.emoji) {
                isOld = true;
                break;
              }
            }
          } else if (reaction2.type === "custom_emoji") {
            for (const old of old_reaction) {
              if (old.type !== "custom_emoji")
                continue;
              if (old.custom_emoji_id === reaction2.custom_emoji_id) {
                isOld = true;
                break;
              }
            }
          } else if (reaction2.type === "paid") {
            for (const old of old_reaction) {
              if (old.type !== "paid")
                continue;
              isOld = true;
              break;
            }
          }
          if (isOld)
            continue;
          if (reaction2.type === "emoji") {
            if (emoji.has(reaction2.emoji))
              return true;
          } else if (reaction2.type === "custom_emoji") {
            if (customEmoji.has(reaction2.custom_emoji_id))
              return true;
          } else if (reaction2.type === "paid") {
            if (paid)
              return true;
          } else {
            return true;
          }
        }
        return false;
      };
    },
    chatType(chatType) {
      const set = new Set(toArray(chatType));
      return (ctx) => {
        var _a;
        return ((_a = ctx.chat) === null || _a === undefined ? undefined : _a.type) !== undefined && set.has(ctx.chat.type);
      };
    },
    callbackQuery(trigger) {
      const hasCallbackQuery = checker.filterQuery("callback_query:data");
      const trg = triggerFn(trigger);
      return (ctx) => hasCallbackQuery(ctx) && match(ctx, ctx.callbackQuery.data, trg);
    },
    gameQuery(trigger) {
      const hasGameQuery = checker.filterQuery("callback_query:game_short_name");
      const trg = triggerFn(trigger);
      return (ctx) => hasGameQuery(ctx) && match(ctx, ctx.callbackQuery.game_short_name, trg);
    },
    inlineQuery(trigger) {
      const hasInlineQuery = checker.filterQuery("inline_query");
      const trg = triggerFn(trigger);
      return (ctx) => hasInlineQuery(ctx) && match(ctx, ctx.inlineQuery.query, trg);
    },
    chosenInlineResult(trigger) {
      const hasChosenInlineResult = checker.filterQuery("chosen_inline_result");
      const trg = triggerFn(trigger);
      return (ctx) => hasChosenInlineResult(ctx) && match(ctx, ctx.chosenInlineResult.result_id, trg);
    },
    preCheckoutQuery(trigger) {
      const hasPreCheckoutQuery = checker.filterQuery("pre_checkout_query");
      const trg = triggerFn(trigger);
      return (ctx) => hasPreCheckoutQuery(ctx) && match(ctx, ctx.preCheckoutQuery.invoice_payload, trg);
    },
    shippingQuery(trigger) {
      const hasShippingQuery = checker.filterQuery("shipping_query");
      const trg = triggerFn(trigger);
      return (ctx) => hasShippingQuery(ctx) && match(ctx, ctx.shippingQuery.invoice_payload, trg);
    }
  };

  class Context {
    constructor(update, api, me) {
      this.update = update;
      this.api = api;
      this.me = me;
    }
    get message() {
      return this.update.message;
    }
    get editedMessage() {
      return this.update.edited_message;
    }
    get channelPost() {
      return this.update.channel_post;
    }
    get editedChannelPost() {
      return this.update.edited_channel_post;
    }
    get businessConnection() {
      return this.update.business_connection;
    }
    get businessMessage() {
      return this.update.business_message;
    }
    get editedBusinessMessage() {
      return this.update.edited_business_message;
    }
    get deletedBusinessMessages() {
      return this.update.deleted_business_messages;
    }
    get guestMessage() {
      return this.update.guest_message;
    }
    get stoppedMessageGeneration() {
      return this.update.stopped_message_generation;
    }
    get messageReaction() {
      return this.update.message_reaction;
    }
    get messageReactionCount() {
      return this.update.message_reaction_count;
    }
    get inlineQuery() {
      return this.update.inline_query;
    }
    get chosenInlineResult() {
      return this.update.chosen_inline_result;
    }
    get callbackQuery() {
      return this.update.callback_query;
    }
    get shippingQuery() {
      return this.update.shipping_query;
    }
    get preCheckoutQuery() {
      return this.update.pre_checkout_query;
    }
    get poll() {
      return this.update.poll;
    }
    get pollAnswer() {
      return this.update.poll_answer;
    }
    get myChatMember() {
      return this.update.my_chat_member;
    }
    get chatMember() {
      return this.update.chat_member;
    }
    get managedBot() {
      return this.update.managed_bot;
    }
    get chatJoinRequest() {
      return this.update.chat_join_request;
    }
    get chatBoost() {
      return this.update.chat_boost;
    }
    get removedChatBoost() {
      return this.update.removed_chat_boost;
    }
    get purchasedPaidMedia() {
      return this.update.purchased_paid_media;
    }
    get subscription() {
      return this.update.subscription;
    }
    get msg() {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      return (_g = (_f = (_e = (_d = (_c = (_b = (_a = this.message) !== null && _a !== undefined ? _a : this.editedMessage) !== null && _b !== undefined ? _b : this.channelPost) !== null && _c !== undefined ? _c : this.editedChannelPost) !== null && _d !== undefined ? _d : this.businessMessage) !== null && _e !== undefined ? _e : this.editedBusinessMessage) !== null && _f !== undefined ? _f : this.guestMessage) !== null && _g !== undefined ? _g : (_h = this.callbackQuery) === null || _h === undefined ? undefined : _h.message;
    }
    get chat() {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
      return (_k = (_j = (_h = (_g = (_f = (_e = (_d = (_c = (_b = (_a = this.msg) !== null && _a !== undefined ? _a : this.deletedBusinessMessages) !== null && _b !== undefined ? _b : this.stoppedMessageGeneration) !== null && _c !== undefined ? _c : this.messageReaction) !== null && _d !== undefined ? _d : this.messageReactionCount) !== null && _e !== undefined ? _e : this.myChatMember) !== null && _f !== undefined ? _f : this.chatMember) !== null && _g !== undefined ? _g : this.chatJoinRequest) !== null && _h !== undefined ? _h : this.chatBoost) !== null && _j !== undefined ? _j : this.removedChatBoost) === null || _k === undefined ? undefined : _k.chat;
    }
    get senderChat() {
      var _a;
      return (_a = this.msg) === null || _a === undefined ? undefined : _a.sender_chat;
    }
    get from() {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
      return (_j = (_h = (_g = (_c = (_b = (_a = this.businessConnection) !== null && _a !== undefined ? _a : this.messageReaction) !== null && _b !== undefined ? _b : this.managedBot) !== null && _c !== undefined ? _c : (_f = (_e = (_d = this.chatBoost) === null || _d === undefined ? undefined : _d.boost) !== null && _e !== undefined ? _e : this.removedChatBoost) === null || _f === undefined ? undefined : _f.source) !== null && _g !== undefined ? _g : this.subscription) === null || _h === undefined ? undefined : _h.user) !== null && _j !== undefined ? _j : (_u = (_t = (_s = (_r = (_q = (_p = (_o = (_m = (_l = (_k = this.callbackQuery) !== null && _k !== undefined ? _k : this.msg) !== null && _l !== undefined ? _l : this.inlineQuery) !== null && _m !== undefined ? _m : this.chosenInlineResult) !== null && _o !== undefined ? _o : this.shippingQuery) !== null && _p !== undefined ? _p : this.preCheckoutQuery) !== null && _q !== undefined ? _q : this.myChatMember) !== null && _r !== undefined ? _r : this.chatMember) !== null && _s !== undefined ? _s : this.chatJoinRequest) !== null && _t !== undefined ? _t : this.purchasedPaidMedia) === null || _u === undefined ? undefined : _u.from;
    }
    get msgId() {
      var _a, _b, _c, _d, _e;
      return (_d = (_b = (_a = this.msg) === null || _a === undefined ? undefined : _a.message_id) !== null && _b !== undefined ? _b : (_c = this.messageReaction) === null || _c === undefined ? undefined : _c.message_id) !== null && _d !== undefined ? _d : (_e = this.messageReactionCount) === null || _e === undefined ? undefined : _e.message_id;
    }
    get chatId() {
      var _a, _b, _c;
      return (_b = (_a = this.chat) === null || _a === undefined ? undefined : _a.id) !== null && _b !== undefined ? _b : (_c = this.businessConnection) === null || _c === undefined ? undefined : _c.user_chat_id;
    }
    get inlineMessageId() {
      var _a, _b, _c;
      return (_b = (_a = this.callbackQuery) === null || _a === undefined ? undefined : _a.inline_message_id) !== null && _b !== undefined ? _b : (_c = this.chosenInlineResult) === null || _c === undefined ? undefined : _c.inline_message_id;
    }
    get businessConnectionId() {
      var _a, _b, _c, _d, _e;
      return (_d = (_b = (_a = this.msg) === null || _a === undefined ? undefined : _a.business_connection_id) !== null && _b !== undefined ? _b : (_c = this.businessConnection) === null || _c === undefined ? undefined : _c.id) !== null && _d !== undefined ? _d : (_e = this.deletedBusinessMessages) === null || _e === undefined ? undefined : _e.business_connection_id;
    }
    entities(types) {
      var _a, _b;
      const message = this.msg;
      if (message === undefined)
        return [];
      const text = (_a = message.text) !== null && _a !== undefined ? _a : message.caption;
      if (text === undefined)
        return [];
      let entities = (_b = message.entities) !== null && _b !== undefined ? _b : message.caption_entities;
      if (entities === undefined)
        return [];
      if (types !== undefined) {
        const filters = new Set(toArray(types));
        entities = entities.filter((entity) => filters.has(entity.type));
      }
      return entities.map((entity) => ({
        ...entity,
        text: text.substring(entity.offset, entity.offset + entity.length)
      }));
    }
    reactions() {
      const emoji = [];
      const emojiAdded = [];
      const emojiKept = [];
      const emojiRemoved = [];
      const customEmoji = [];
      const customEmojiAdded = [];
      const customEmojiKept = [];
      const customEmojiRemoved = [];
      let paid = false;
      let paidAdded = false;
      const r = this.messageReaction;
      if (r !== undefined) {
        const { old_reaction, new_reaction } = r;
        for (const reaction of new_reaction) {
          if (reaction.type === "emoji") {
            emoji.push(reaction.emoji);
          } else if (reaction.type === "custom_emoji") {
            customEmoji.push(reaction.custom_emoji_id);
          } else if (reaction.type === "paid") {
            paid = paidAdded = true;
          }
        }
        for (const reaction of old_reaction) {
          if (reaction.type === "emoji") {
            emojiRemoved.push(reaction.emoji);
          } else if (reaction.type === "custom_emoji") {
            customEmojiRemoved.push(reaction.custom_emoji_id);
          } else if (reaction.type === "paid") {
            paidAdded = false;
          }
        }
        emojiAdded.push(...emoji);
        customEmojiAdded.push(...customEmoji);
        for (let i = 0;i < emojiRemoved.length; i++) {
          const len = emojiAdded.length;
          if (len === 0)
            break;
          const rem = emojiRemoved[i];
          for (let j = 0;j < len; j++) {
            if (rem === emojiAdded[j]) {
              emojiKept.push(rem);
              emojiRemoved.splice(i, 1);
              emojiAdded.splice(j, 1);
              i--;
              break;
            }
          }
        }
        for (let i = 0;i < customEmojiRemoved.length; i++) {
          const len = customEmojiAdded.length;
          if (len === 0)
            break;
          const rem = customEmojiRemoved[i];
          for (let j = 0;j < len; j++) {
            if (rem === customEmojiAdded[j]) {
              customEmojiKept.push(rem);
              customEmojiRemoved.splice(i, 1);
              customEmojiAdded.splice(j, 1);
              i--;
              break;
            }
          }
        }
      }
      return {
        emoji,
        emojiAdded,
        emojiKept,
        emojiRemoved,
        customEmoji,
        customEmojiAdded,
        customEmojiKept,
        customEmojiRemoved,
        paid,
        paidAdded
      };
    }
    has(filter) {
      return Context.has.filterQuery(filter)(this);
    }
    hasText(trigger) {
      return Context.has.text(trigger)(this);
    }
    hasCommand(command) {
      return Context.has.command(command)(this);
    }
    hasReaction(reaction) {
      return Context.has.reaction(reaction)(this);
    }
    hasChatType(chatType) {
      return Context.has.chatType(chatType)(this);
    }
    hasCallbackQuery(trigger) {
      return Context.has.callbackQuery(trigger)(this);
    }
    hasGameQuery(trigger) {
      return Context.has.gameQuery(trigger)(this);
    }
    hasInlineQuery(trigger) {
      return Context.has.inlineQuery(trigger)(this);
    }
    hasChosenInlineResult(trigger) {
      return Context.has.chosenInlineResult(trigger)(this);
    }
    hasPreCheckoutQuery(trigger) {
      return Context.has.preCheckoutQuery(trigger)(this);
    }
    hasShippingQuery(trigger) {
      return Context.has.shippingQuery(trigger)(this);
    }
    reply(text, other, signal) {
      var _a;
      const msg = this.msg;
      return this.api.sendMessage(orThrow(this.chatId, "sendMessage"), text, {
        business_connection_id: this.businessConnectionId,
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        direct_messages_topic_id: (_a = msg === null || msg === undefined ? undefined : msg.direct_messages_topic) === null || _a === undefined ? undefined : _a.topic_id,
        ...other
      }, signal);
    }
    replyWithRichMessage(rich_message, other, signal) {
      var _a;
      const msg = this.msg;
      return this.api.sendRichMessage(orThrow(this.chatId, "sendRichMessage"), rich_message, {
        business_connection_id: this.businessConnectionId,
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        direct_messages_topic_id: (_a = msg === null || msg === undefined ? undefined : msg.direct_messages_topic) === null || _a === undefined ? undefined : _a.topic_id,
        ...other
      }, signal);
    }
    forwardMessage(chat_id, other, signal) {
      var _a;
      const msg = this.msg;
      return this.api.forwardMessage(chat_id, orThrow(this.chatId, "forwardMessage"), orThrow(this.msgId, "forwardMessage"), {
        direct_messages_topic_id: (_a = msg === null || msg === undefined ? undefined : msg.direct_messages_topic) === null || _a === undefined ? undefined : _a.topic_id,
        ...other
      }, signal);
    }
    forwardMessages(chat_id, message_ids, other, signal) {
      var _a;
      const msg = this.msg;
      return this.api.forwardMessages(chat_id, orThrow(this.chatId, "forwardMessages"), message_ids, {
        direct_messages_topic_id: (_a = msg === null || msg === undefined ? undefined : msg.direct_messages_topic) === null || _a === undefined ? undefined : _a.topic_id,
        ...other
      }, signal);
    }
    copyMessage(chat_id, other, signal) {
      var _a;
      const msg = this.msg;
      return this.api.copyMessage(chat_id, orThrow(this.chatId, "copyMessage"), orThrow(this.msgId, "copyMessage"), {
        direct_messages_topic_id: (_a = msg === null || msg === undefined ? undefined : msg.direct_messages_topic) === null || _a === undefined ? undefined : _a.topic_id,
        ...other
      }, signal);
    }
    copyMessages(chat_id, message_ids, other, signal) {
      var _a;
      const msg = this.msg;
      return this.api.copyMessages(chat_id, orThrow(this.chatId, "copyMessages"), message_ids, {
        direct_messages_topic_id: (_a = msg === null || msg === undefined ? undefined : msg.direct_messages_topic) === null || _a === undefined ? undefined : _a.topic_id,
        ...other
      }, signal);
    }
    replyWithPhoto(photo, other, signal) {
      var _a;
      const msg = this.msg;
      return this.api.sendPhoto(orThrow(this.chatId, "sendPhoto"), photo, {
        business_connection_id: this.businessConnectionId,
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        direct_messages_topic_id: (_a = msg === null || msg === undefined ? undefined : msg.direct_messages_topic) === null || _a === undefined ? undefined : _a.topic_id,
        ...other
      }, signal);
    }
    replyWithLivePhoto(live_photo, photo, other, signal) {
      var _a;
      const msg = this.msg;
      return this.api.sendLivePhoto(orThrow(this.chatId, "sendLivePhoto"), live_photo, photo, {
        business_connection_id: this.businessConnectionId,
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        direct_messages_topic_id: (_a = msg === null || msg === undefined ? undefined : msg.direct_messages_topic) === null || _a === undefined ? undefined : _a.topic_id,
        ...other
      }, signal);
    }
    replyWithAudio(audio, other, signal) {
      var _a;
      const msg = this.msg;
      return this.api.sendAudio(orThrow(this.chatId, "sendAudio"), audio, {
        business_connection_id: this.businessConnectionId,
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        direct_messages_topic_id: (_a = msg === null || msg === undefined ? undefined : msg.direct_messages_topic) === null || _a === undefined ? undefined : _a.topic_id,
        ...other
      }, signal);
    }
    replyWithDocument(document2, other, signal) {
      var _a;
      const msg = this.msg;
      return this.api.sendDocument(orThrow(this.chatId, "sendDocument"), document2, {
        business_connection_id: this.businessConnectionId,
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        direct_messages_topic_id: (_a = msg === null || msg === undefined ? undefined : msg.direct_messages_topic) === null || _a === undefined ? undefined : _a.topic_id,
        ...other
      }, signal);
    }
    replyWithVideo(video, other, signal) {
      var _a;
      const msg = this.msg;
      return this.api.sendVideo(orThrow(this.chatId, "sendVideo"), video, {
        business_connection_id: this.businessConnectionId,
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        direct_messages_topic_id: (_a = msg === null || msg === undefined ? undefined : msg.direct_messages_topic) === null || _a === undefined ? undefined : _a.topic_id,
        ...other
      }, signal);
    }
    replyWithAnimation(animation, other, signal) {
      var _a;
      const msg = this.msg;
      return this.api.sendAnimation(orThrow(this.chatId, "sendAnimation"), animation, {
        business_connection_id: this.businessConnectionId,
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        direct_messages_topic_id: (_a = msg === null || msg === undefined ? undefined : msg.direct_messages_topic) === null || _a === undefined ? undefined : _a.topic_id,
        ...other
      }, signal);
    }
    replyWithVoice(voice, other, signal) {
      var _a;
      const msg = this.msg;
      return this.api.sendVoice(orThrow(this.chatId, "sendVoice"), voice, {
        business_connection_id: this.businessConnectionId,
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        direct_messages_topic_id: (_a = msg === null || msg === undefined ? undefined : msg.direct_messages_topic) === null || _a === undefined ? undefined : _a.topic_id,
        ...other
      }, signal);
    }
    replyWithVideoNote(video_note, other, signal) {
      var _a;
      const msg = this.msg;
      return this.api.sendVideoNote(orThrow(this.chatId, "sendVideoNote"), video_note, {
        business_connection_id: this.businessConnectionId,
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        direct_messages_topic_id: (_a = msg === null || msg === undefined ? undefined : msg.direct_messages_topic) === null || _a === undefined ? undefined : _a.topic_id,
        ...other
      }, signal);
    }
    sendPaidMedia(...args) {
      return this.replyWithPaidMedia(...args);
    }
    replyWithPaidMedia(star_count, media, other, signal) {
      var _a, _b;
      const msg = this.msg;
      return this.api.sendPaidMedia(orThrow(this.chatId, "sendPaidMedia"), star_count, media, {
        business_connection_id: this.businessConnectionId,
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        direct_messages_topic_id: (_b = (_a = this.msg) === null || _a === undefined ? undefined : _a.direct_messages_topic) === null || _b === undefined ? undefined : _b.topic_id,
        ...other
      }, signal);
    }
    replyWithMediaGroup(media, other, signal) {
      var _a;
      const msg = this.msg;
      return this.api.sendMediaGroup(orThrow(this.chatId, "sendMediaGroup"), media, {
        business_connection_id: this.businessConnectionId,
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        direct_messages_topic_id: (_a = msg === null || msg === undefined ? undefined : msg.direct_messages_topic) === null || _a === undefined ? undefined : _a.topic_id,
        ...other
      }, signal);
    }
    replyWithLocation(latitude, longitude, other, signal) {
      var _a;
      const msg = this.msg;
      return this.api.sendLocation(orThrow(this.chatId, "sendLocation"), latitude, longitude, {
        business_connection_id: this.businessConnectionId,
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        direct_messages_topic_id: (_a = msg === null || msg === undefined ? undefined : msg.direct_messages_topic) === null || _a === undefined ? undefined : _a.topic_id,
        ...other
      }, signal);
    }
    editMessageLiveLocation(latitude, longitude, other, signal) {
      const inlineId = this.inlineMessageId;
      return inlineId !== undefined ? this.api.editMessageLiveLocationInline(inlineId, latitude, longitude, { business_connection_id: this.businessConnectionId, ...other }, signal) : this.api.editMessageLiveLocation(orThrow(this.chatId, "editMessageLiveLocation"), orThrow(this.msgId, "editMessageLiveLocation"), latitude, longitude, { business_connection_id: this.businessConnectionId, ...other }, signal);
    }
    stopMessageLiveLocation(other, signal) {
      const inlineId = this.inlineMessageId;
      return inlineId !== undefined ? this.api.stopMessageLiveLocationInline(inlineId, { business_connection_id: this.businessConnectionId, ...other }, signal) : this.api.stopMessageLiveLocation(orThrow(this.chatId, "stopMessageLiveLocation"), orThrow(this.msgId, "stopMessageLiveLocation"), { business_connection_id: this.businessConnectionId, ...other }, signal);
    }
    replyWithVenue(latitude, longitude, title, address, other, signal) {
      var _a;
      const msg = this.msg;
      return this.api.sendVenue(orThrow(this.chatId, "sendVenue"), latitude, longitude, title, address, {
        business_connection_id: this.businessConnectionId,
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        direct_messages_topic_id: (_a = msg === null || msg === undefined ? undefined : msg.direct_messages_topic) === null || _a === undefined ? undefined : _a.topic_id,
        ...other
      }, signal);
    }
    replyWithContact(phone_number, first_name, other, signal) {
      var _a;
      const msg = this.msg;
      return this.api.sendContact(orThrow(this.chatId, "sendContact"), phone_number, first_name, {
        business_connection_id: this.businessConnectionId,
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        direct_messages_topic_id: (_a = msg === null || msg === undefined ? undefined : msg.direct_messages_topic) === null || _a === undefined ? undefined : _a.topic_id,
        ...other
      }, signal);
    }
    replyWithPoll(question, options, other, signal) {
      const msg = this.msg;
      return this.api.sendPoll(orThrow(this.chatId, "sendPoll"), question, options, {
        business_connection_id: this.businessConnectionId,
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        ...other
      }, signal);
    }
    replyWithChecklist(checklist, other, signal) {
      return this.api.sendChecklist(orThrow(this.businessConnectionId, "sendChecklist"), orThrow(this.chatId, "sendChecklist"), checklist, other, signal);
    }
    editMessageChecklist(checklist, other, signal) {
      var _a, _b, _c, _d;
      const msg = orThrow(this.msg, "editMessageChecklist");
      const target = (_d = (_b = (_a = msg.checklist_tasks_done) === null || _a === undefined ? undefined : _a.checklist_message) !== null && _b !== undefined ? _b : (_c = msg.checklist_tasks_added) === null || _c === undefined ? undefined : _c.checklist_message) !== null && _d !== undefined ? _d : msg;
      return this.api.editMessageChecklist(orThrow(this.businessConnectionId, "editMessageChecklist"), orThrow(target.chat.id, "editMessageChecklist"), orThrow(target.message_id, "editMessageChecklist"), checklist, other, signal);
    }
    replyWithDice(emoji, other, signal) {
      var _a;
      const msg = this.msg;
      return this.api.sendDice(orThrow(this.chatId, "sendDice"), emoji, {
        business_connection_id: this.businessConnectionId,
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        direct_messages_topic_id: (_a = msg === null || msg === undefined ? undefined : msg.direct_messages_topic) === null || _a === undefined ? undefined : _a.topic_id,
        ...other
      }, signal);
    }
    replyWithChatAction(action, other, signal) {
      const msg = this.msg;
      return this.api.sendChatAction(orThrow(this.chatId, "sendChatAction"), action, {
        business_connection_id: this.businessConnectionId,
        message_thread_id: msg === null || msg === undefined ? undefined : msg.message_thread_id,
        ...other
      }, signal);
    }
    react(reaction, other, signal) {
      return this.api.setMessageReaction(orThrow(this.chatId, "setMessageReaction"), orThrow(this.msgId, "setMessageReaction"), typeof reaction === "string" ? [{ type: "emoji", emoji: reaction }] : (Array.isArray(reaction) ? reaction : [reaction]).map((emoji) => typeof emoji === "string" ? { type: "emoji", emoji } : emoji), other, signal);
    }
    replyWithDraft(text, other, signal) {
      const msg = this.msg;
      return this.api.sendMessageDraft(orThrow(this.chatId, "sendMessageDraft"), this.update.update_id, text, {
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        ...other
      }, signal);
    }
    replyWithRichMessageDraft(rich_message, other, signal) {
      const msg = this.msg;
      return this.api.sendRichMessageDraft(orThrow(this.chatId, "sendMessageDraft"), this.update.update_id, rich_message, {
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        ...other
      }, signal);
    }
    getUserProfilePhotos(other, signal) {
      return this.api.getUserProfilePhotos(orThrow(this.from, "getUserProfilePhotos").id, other, signal);
    }
    getUserProfileAudios(other, signal) {
      return this.api.getUserProfileAudios(orThrow(this.from, "getUserProfileAudios").id, other, signal);
    }
    setUserEmojiStatus(other, signal) {
      return this.api.setUserEmojiStatus(orThrow(this.from, "setUserEmojiStatus").id, other, signal);
    }
    getUserChatBoosts(chat_id, signal) {
      return this.api.getUserChatBoosts(chat_id !== null && chat_id !== undefined ? chat_id : orThrow(this.chatId, "getUserChatBoosts"), orThrow(this.from, "getUserChatBoosts").id, signal);
    }
    getUserGifts(other, signal) {
      return this.api.getUserGifts(orThrow(this.from, "getUserGifts").id, other, signal);
    }
    getChatGifts(other, signal) {
      return this.api.getChatGifts(orThrow(this.chatId, "getChatGifts"), other, signal);
    }
    getBusinessConnection(signal) {
      return this.api.getBusinessConnection(orThrow(this.businessConnectionId, "getBusinessConnection"), signal);
    }
    getManagedBotToken(signal) {
      return this.api.getManagedBotToken(orThrow(this.managedBot, "getManagedBotToken").bot.id, signal);
    }
    replaceManagedBotToken(signal) {
      return this.api.replaceManagedBotToken(orThrow(this.managedBot, "getManagedBotToken").bot.id, signal);
    }
    getManagedBotAccessSettings(signal) {
      return this.api.getManagedBotAccessSettings(orThrow(this.managedBot, "getManagedBotAccessSettings").bot.id, signal);
    }
    setManagedBotAccessSettings(is_access_restricted, other, signal) {
      return this.api.setManagedBotAccessSettings(orThrow(this.managedBot, "setManagedBotAccessSettings").bot.id, is_access_restricted, other, signal);
    }
    getFile(signal) {
      var _a, _b, _c, _d, _e, _f;
      const m = orThrow(this.msg, "getFile");
      const file = m.photo !== undefined ? m.photo[m.photo.length - 1] : (_f = (_e = (_d = (_c = (_b = (_a = m.animation) !== null && _a !== undefined ? _a : m.audio) !== null && _b !== undefined ? _b : m.document) !== null && _c !== undefined ? _c : m.video) !== null && _d !== undefined ? _d : m.video_note) !== null && _e !== undefined ? _e : m.voice) !== null && _f !== undefined ? _f : m.sticker;
      return this.api.getFile(orThrow(file, "getFile").file_id, signal);
    }
    kickAuthor(...args) {
      return this.banAuthor(...args);
    }
    banAuthor(other, signal) {
      return this.api.banChatMember(orThrow(this.chatId, "banAuthor"), orThrow(this.from, "banAuthor").id, other, signal);
    }
    kickChatMember(...args) {
      return this.banChatMember(...args);
    }
    banChatMember(user_id, other, signal) {
      return this.api.banChatMember(orThrow(this.chatId, "banChatMember"), user_id, other, signal);
    }
    unbanChatMember(user_id, other, signal) {
      return this.api.unbanChatMember(orThrow(this.chatId, "unbanChatMember"), user_id, other, signal);
    }
    restrictAuthor(permissions, other, signal) {
      return this.api.restrictChatMember(orThrow(this.chatId, "restrictAuthor"), orThrow(this.from, "restrictAuthor").id, permissions, other, signal);
    }
    restrictChatMember(user_id, permissions, other, signal) {
      return this.api.restrictChatMember(orThrow(this.chatId, "restrictChatMember"), user_id, permissions, other, signal);
    }
    promoteAuthor(other, signal) {
      return this.api.promoteChatMember(orThrow(this.chatId, "promoteAuthor"), orThrow(this.from, "promoteAuthor").id, other, signal);
    }
    promoteChatMember(user_id, other, signal) {
      return this.api.promoteChatMember(orThrow(this.chatId, "promoteChatMember"), user_id, other, signal);
    }
    setChatAdministratorAuthorCustomTitle(custom_title, signal) {
      return this.api.setChatAdministratorCustomTitle(orThrow(this.chatId, "setChatAdministratorAuthorCustomTitle"), orThrow(this.from, "setChatAdministratorAuthorCustomTitle").id, custom_title, signal);
    }
    setChatAdministratorCustomTitle(user_id, custom_title, signal) {
      return this.api.setChatAdministratorCustomTitle(orThrow(this.chatId, "setChatAdministratorCustomTitle"), user_id, custom_title, signal);
    }
    setAuthorTag(tag, signal) {
      return this.api.setChatMemberTag(orThrow(this.chatId, "setChatMemberTag"), orThrow(this.from, "setChatMemberTag").id, tag, signal);
    }
    setChatMemberTag(user_id, tag, signal) {
      return this.api.setChatMemberTag(orThrow(this.chatId, "setChatMemberTag"), user_id, tag, signal);
    }
    banChatSenderChat(sender_chat_id, signal) {
      return this.api.banChatSenderChat(orThrow(this.chatId, "banChatSenderChat"), sender_chat_id, signal);
    }
    unbanChatSenderChat(sender_chat_id, signal) {
      return this.api.unbanChatSenderChat(orThrow(this.chatId, "unbanChatSenderChat"), sender_chat_id, signal);
    }
    setChatPermissions(permissions, other, signal) {
      return this.api.setChatPermissions(orThrow(this.chatId, "setChatPermissions"), permissions, other, signal);
    }
    exportChatInviteLink(signal) {
      return this.api.exportChatInviteLink(orThrow(this.chatId, "exportChatInviteLink"), signal);
    }
    createChatInviteLink(other, signal) {
      return this.api.createChatInviteLink(orThrow(this.chatId, "createChatInviteLink"), other, signal);
    }
    editChatInviteLink(invite_link, other, signal) {
      return this.api.editChatInviteLink(orThrow(this.chatId, "editChatInviteLink"), invite_link, other, signal);
    }
    createChatSubscriptionInviteLink(subscription_period, subscription_price, other, signal) {
      return this.api.createChatSubscriptionInviteLink(orThrow(this.chatId, "createChatSubscriptionInviteLink"), subscription_period, subscription_price, other, signal);
    }
    editChatSubscriptionInviteLink(invite_link, other, signal) {
      return this.api.editChatSubscriptionInviteLink(orThrow(this.chatId, "editChatSubscriptionInviteLink"), invite_link, other, signal);
    }
    revokeChatInviteLink(invite_link, signal) {
      return this.api.revokeChatInviteLink(orThrow(this.chatId, "editChatInviteLink"), invite_link, signal);
    }
    approveChatJoinRequest(user_id, signal) {
      return this.api.approveChatJoinRequest(orThrow(this.chatId, "approveChatJoinRequest"), user_id, signal);
    }
    declineChatJoinRequest(user_id, signal) {
      return this.api.declineChatJoinRequest(orThrow(this.chatId, "declineChatJoinRequest"), user_id, signal);
    }
    answerChatJoinRequestQuery(result, signal) {
      var _a;
      return this.api.answerChatJoinRequestQuery(orThrow((_a = this.chatJoinRequest) === null || _a === undefined ? undefined : _a.query_id, "answerChatJoinRequestQuery"), result, signal);
    }
    replyWithChatJoinRequestWebApp(web_app_url, signal) {
      var _a;
      return this.api.sendChatJoinRequestWebApp(orThrow((_a = this.chatJoinRequest) === null || _a === undefined ? undefined : _a.query_id, "answerChatJoinRequestQuery"), web_app_url, signal);
    }
    approveSuggestedPost(other, signal) {
      return this.api.approveSuggestedPost(orThrow(this.chatId, "approveSuggestedPost"), orThrow(this.msgId, "approveSuggestedPost"), other, signal);
    }
    declineSuggestedPost(other, signal) {
      return this.api.declineSuggestedPost(orThrow(this.chatId, "declineSuggestedPost"), orThrow(this.msgId, "declineSuggestedPost"), other, signal);
    }
    setChatPhoto(photo, signal) {
      return this.api.setChatPhoto(orThrow(this.chatId, "setChatPhoto"), photo, signal);
    }
    deleteChatPhoto(signal) {
      return this.api.deleteChatPhoto(orThrow(this.chatId, "deleteChatPhoto"), signal);
    }
    setChatTitle(title, signal) {
      return this.api.setChatTitle(orThrow(this.chatId, "setChatTitle"), title, signal);
    }
    setChatDescription(description, signal) {
      return this.api.setChatDescription(orThrow(this.chatId, "setChatDescription"), description, signal);
    }
    pinChatMessage(message_id, other, signal) {
      return this.api.pinChatMessage(orThrow(this.chatId, "pinChatMessage"), message_id, { business_connection_id: this.businessConnectionId, ...other }, signal);
    }
    unpinChatMessage(message_id, other, signal) {
      return this.api.unpinChatMessage(orThrow(this.chatId, "unpinChatMessage"), message_id, { business_connection_id: this.businessConnectionId, ...other }, signal);
    }
    unpinAllChatMessages(signal) {
      return this.api.unpinAllChatMessages(orThrow(this.chatId, "unpinAllChatMessages"), signal);
    }
    leaveChat(signal) {
      return this.api.leaveChat(orThrow(this.chatId, "leaveChat"), signal);
    }
    getChat(signal) {
      return this.api.getChat(orThrow(this.chatId, "getChat"), signal);
    }
    getChatAdministrators(other, signal) {
      return this.api.getChatAdministrators(orThrow(this.chatId, "getChatAdministrators"), other, signal);
    }
    getChatMembersCount(...args) {
      return this.getChatMemberCount(...args);
    }
    getChatMemberCount(signal) {
      return this.api.getChatMemberCount(orThrow(this.chatId, "getChatMemberCount"), signal);
    }
    getAuthor(signal) {
      return this.api.getChatMember(orThrow(this.chatId, "getAuthor"), orThrow(this.from, "getAuthor").id, signal);
    }
    getChatMember(user_id, signal) {
      return this.api.getChatMember(orThrow(this.chatId, "getChatMember"), user_id, signal);
    }
    getUserPersonalChatMessages(limit, signal) {
      return this.api.getUserPersonalChatMessages(orThrow(this.from, "getUserPersonalChatMessages").id, limit, signal);
    }
    setChatStickerSet(sticker_set_name, signal) {
      return this.api.setChatStickerSet(orThrow(this.chatId, "setChatStickerSet"), sticker_set_name, signal);
    }
    deleteChatStickerSet(signal) {
      return this.api.deleteChatStickerSet(orThrow(this.chatId, "deleteChatStickerSet"), signal);
    }
    createForumTopic(name, other, signal) {
      return this.api.createForumTopic(orThrow(this.chatId, "createForumTopic"), name, other, signal);
    }
    editForumTopic(other, signal) {
      const message = orThrow(this.msg, "editForumTopic");
      const thread = orThrow(message.message_thread_id, "editForumTopic");
      return this.api.editForumTopic(message.chat.id, thread, other, signal);
    }
    closeForumTopic(signal) {
      const message = orThrow(this.msg, "closeForumTopic");
      const thread = orThrow(message.message_thread_id, "closeForumTopic");
      return this.api.closeForumTopic(message.chat.id, thread, signal);
    }
    reopenForumTopic(signal) {
      const message = orThrow(this.msg, "reopenForumTopic");
      const thread = orThrow(message.message_thread_id, "reopenForumTopic");
      return this.api.reopenForumTopic(message.chat.id, thread, signal);
    }
    deleteForumTopic(signal) {
      const message = orThrow(this.msg, "deleteForumTopic");
      const thread = orThrow(message.message_thread_id, "deleteForumTopic");
      return this.api.deleteForumTopic(message.chat.id, thread, signal);
    }
    unpinAllForumTopicMessages(signal) {
      const message = orThrow(this.msg, "unpinAllForumTopicMessages");
      const thread = orThrow(message.message_thread_id, "unpinAllForumTopicMessages");
      return this.api.unpinAllForumTopicMessages(message.chat.id, thread, signal);
    }
    editGeneralForumTopic(name, signal) {
      return this.api.editGeneralForumTopic(orThrow(this.chatId, "editGeneralForumTopic"), name, signal);
    }
    closeGeneralForumTopic(signal) {
      return this.api.closeGeneralForumTopic(orThrow(this.chatId, "closeGeneralForumTopic"), signal);
    }
    reopenGeneralForumTopic(signal) {
      return this.api.reopenGeneralForumTopic(orThrow(this.chatId, "reopenGeneralForumTopic"), signal);
    }
    hideGeneralForumTopic(signal) {
      return this.api.hideGeneralForumTopic(orThrow(this.chatId, "hideGeneralForumTopic"), signal);
    }
    unhideGeneralForumTopic(signal) {
      return this.api.unhideGeneralForumTopic(orThrow(this.chatId, "unhideGeneralForumTopic"), signal);
    }
    unpinAllGeneralForumTopicMessages(signal) {
      return this.api.unpinAllGeneralForumTopicMessages(orThrow(this.chatId, "unpinAllGeneralForumTopicMessages"), signal);
    }
    answerCallbackQuery(other, signal) {
      return this.api.answerCallbackQuery(orThrow(this.callbackQuery, "answerCallbackQuery").id, typeof other === "string" ? { text: other } : other, signal);
    }
    answerGuestQuery(result, signal) {
      var _a;
      return this.api.answerGuestQuery(orThrow((_a = this.guestMessage) === null || _a === undefined ? undefined : _a.guest_query_id, "answerGuestQuery"), result, signal);
    }
    setChatMenuButton(other, signal) {
      return this.api.setChatMenuButton(other, signal);
    }
    getChatMenuButton(other, signal) {
      return this.api.getChatMenuButton(other, signal);
    }
    setMyDefaultAdministratorRights(other, signal) {
      return this.api.setMyDefaultAdministratorRights(other, signal);
    }
    getMyDefaultAdministratorRights(other, signal) {
      return this.api.getMyDefaultAdministratorRights(other, signal);
    }
    editMessageText(text, other, signal) {
      var _a, _b, _c, _d, _e;
      const inlineId = this.inlineMessageId;
      return inlineId !== undefined ? this.api.editMessageTextInline(inlineId, text, { business_connection_id: this.businessConnectionId, ...other }, signal) : this.api.editMessageText(orThrow(this.chatId, "editMessageText"), orThrow((_d = (_b = (_a = this.msg) === null || _a === undefined ? undefined : _a.message_id) !== null && _b !== undefined ? _b : (_c = this.messageReaction) === null || _c === undefined ? undefined : _c.message_id) !== null && _d !== undefined ? _d : (_e = this.messageReactionCount) === null || _e === undefined ? undefined : _e.message_id, "editMessageText"), text, { business_connection_id: this.businessConnectionId, ...other }, signal);
    }
    editMessageCaption(other, signal) {
      var _a, _b, _c, _d, _e;
      const inlineId = this.inlineMessageId;
      return inlineId !== undefined ? this.api.editMessageCaptionInline(inlineId, { business_connection_id: this.businessConnectionId, ...other }, signal) : this.api.editMessageCaption(orThrow(this.chatId, "editMessageCaption"), orThrow((_d = (_b = (_a = this.msg) === null || _a === undefined ? undefined : _a.message_id) !== null && _b !== undefined ? _b : (_c = this.messageReaction) === null || _c === undefined ? undefined : _c.message_id) !== null && _d !== undefined ? _d : (_e = this.messageReactionCount) === null || _e === undefined ? undefined : _e.message_id, "editMessageCaption"), { business_connection_id: this.businessConnectionId, ...other }, signal);
    }
    editMessageMedia(media, other, signal) {
      var _a, _b, _c, _d, _e;
      const inlineId = this.inlineMessageId;
      return inlineId !== undefined ? this.api.editMessageMediaInline(inlineId, media, { business_connection_id: this.businessConnectionId, ...other }, signal) : this.api.editMessageMedia(orThrow(this.chatId, "editMessageMedia"), orThrow((_d = (_b = (_a = this.msg) === null || _a === undefined ? undefined : _a.message_id) !== null && _b !== undefined ? _b : (_c = this.messageReaction) === null || _c === undefined ? undefined : _c.message_id) !== null && _d !== undefined ? _d : (_e = this.messageReactionCount) === null || _e === undefined ? undefined : _e.message_id, "editMessageMedia"), media, { business_connection_id: this.businessConnectionId, ...other }, signal);
    }
    editMessageReplyMarkup(other, signal) {
      var _a, _b, _c, _d, _e;
      const inlineId = this.inlineMessageId;
      return inlineId !== undefined ? this.api.editMessageReplyMarkupInline(inlineId, { business_connection_id: this.businessConnectionId, ...other }, signal) : this.api.editMessageReplyMarkup(orThrow(this.chatId, "editMessageReplyMarkup"), orThrow((_d = (_b = (_a = this.msg) === null || _a === undefined ? undefined : _a.message_id) !== null && _b !== undefined ? _b : (_c = this.messageReaction) === null || _c === undefined ? undefined : _c.message_id) !== null && _d !== undefined ? _d : (_e = this.messageReactionCount) === null || _e === undefined ? undefined : _e.message_id, "editMessageReplyMarkup"), { business_connection_id: this.businessConnectionId, ...other }, signal);
    }
    stopPoll(other, signal) {
      var _a, _b, _c, _d, _e;
      return this.api.stopPoll(orThrow(this.chatId, "stopPoll"), orThrow((_d = (_b = (_a = this.msg) === null || _a === undefined ? undefined : _a.message_id) !== null && _b !== undefined ? _b : (_c = this.messageReaction) === null || _c === undefined ? undefined : _c.message_id) !== null && _d !== undefined ? _d : (_e = this.messageReactionCount) === null || _e === undefined ? undefined : _e.message_id, "stopPoll"), { business_connection_id: this.businessConnectionId, ...other }, signal);
    }
    editEphemeralMessageText(text_or_rich_message, other, signal) {
      const msg = orThrow(this.msg, "editEphemeralMessageText");
      return this.api.editEphemeralMessageText(msg.chat.id, orThrow(msg.receiver_user, "editEphemeralMessageText").id, orThrow(msg.ephemeral_message_id, "editEphemeralMessageText"), text_or_rich_message, other, signal);
    }
    editEphemeralMessageMedia(media, other, signal) {
      const msg = orThrow(this.msg, "editEphemeralMessageMedia");
      return this.api.editEphemeralMessageMedia(msg.chat.id, orThrow(msg.receiver_user, "editEphemeralMessageMedia").id, orThrow(msg.ephemeral_message_id, "editEphemeralMessageMedia"), media, other, signal);
    }
    editEphemeralMessageCaption(caption, other, signal) {
      const msg = orThrow(this.msg, "editEphemeralMessageCaption");
      return this.api.editEphemeralMessageCaption(msg.chat.id, orThrow(msg.receiver_user, "editEphemeralMessageCaption").id, orThrow(msg.ephemeral_message_id, "editEphemeralMessageCaption"), caption, other, signal);
    }
    editEphemeralMessageReplyMarkup(other, signal) {
      const msg = orThrow(this.msg, "editEphemeralMessageReplyMarkup");
      return this.api.editEphemeralMessageReplyMarkup(msg.chat.id, orThrow(msg.receiver_user, "editEphemeralMessageReplyMarkup").id, orThrow(msg.ephemeral_message_id, "editEphemeralMessageReplyMarkup"), other, signal);
    }
    deleteMessage(signal) {
      var _a, _b, _c, _d, _e;
      return this.api.deleteMessage(orThrow(this.chatId, "deleteMessage"), orThrow((_d = (_b = (_a = this.msg) === null || _a === undefined ? undefined : _a.message_id) !== null && _b !== undefined ? _b : (_c = this.messageReaction) === null || _c === undefined ? undefined : _c.message_id) !== null && _d !== undefined ? _d : (_e = this.messageReactionCount) === null || _e === undefined ? undefined : _e.message_id, "deleteMessage"), signal);
    }
    deleteMessages(message_ids, signal) {
      return this.api.deleteMessages(orThrow(this.chatId, "deleteMessages"), message_ids, signal);
    }
    deleteEphemeralMessage(signal) {
      const msg = orThrow(this.msg, "deleteEphemeralMessage");
      return this.api.deleteEphemeralMessage(msg.chat.id, orThrow(msg.receiver_user, "deleteEphemeralMessage").id, orThrow(msg.ephemeral_message_id, "deleteEphemeralMessage"), signal);
    }
    deleteMessageReaction(other, signal) {
      const reaction = orThrow(this.messageReaction, "deleteMessageReaction");
      if (reaction.user !== undefined) {
        return this.deleteMessageReactionUser(reaction.user.id, other, signal);
      } else if (reaction.actor_chat !== undefined) {
        return this.deleteMessageReactionChat(reaction.actor_chat.id, other, signal);
      } else {
        throw new Error("Missing information from message_reaction update for API call to deleteMessageReaction");
      }
    }
    deleteMessageReactionUser(user_id, other, signal) {
      return this.api.deleteMessageReactionUser(orThrow(this.chatId, "deleteMessageReactionUser"), orThrow(this.msgId, "deleteMessageReactionUser"), user_id, other, signal);
    }
    deleteMessageReactionChat(actor_chat_id, other, signal) {
      return this.api.deleteMessageReactionChat(orThrow(this.chatId, "deleteMessageReactionChat"), orThrow(this.msgId, "deleteMessageReactionChat"), actor_chat_id, other, signal);
    }
    deleteAllMessageReactions(other, signal) {
      var _a, _b, _c, _d;
      const chatId = orThrow(this.chatId, "deleteAllMessageReactions");
      const actor = (_c = (_b = (_a = this.messageReaction) === null || _a === undefined ? undefined : _a.actor_chat) !== null && _b !== undefined ? _b : this.senderChat) !== null && _c !== undefined ? _c : (_d = this.pollAnswer) === null || _d === undefined ? undefined : _d.voter_chat;
      if (actor !== undefined) {
        return this.api.deleteAllMessageReactionsChat(chatId, actor.id, other, signal);
      }
      const userId = orThrow(this.from, "deleteAllMessageReactions").id;
      return this.api.deleteAllMessageReactionsUser(chatId, userId, other, signal);
    }
    deleteAllMessageReactionsUser(user_id, other, signal) {
      return this.api.deleteAllMessageReactionsUser(orThrow(this.chatId, "deleteAllMessageReactionsUser"), user_id, other, signal);
    }
    deleteAllMessageReactionsChat(actor_chat_id, other, signal) {
      return this.api.deleteAllMessageReactionsChat(orThrow(this.chatId, "deleteAllMessageReactionsChat"), actor_chat_id, other, signal);
    }
    deleteBusinessMessages(message_ids, signal) {
      return this.api.deleteBusinessMessages(orThrow(this.businessConnectionId, "deleteBusinessMessages"), message_ids, signal);
    }
    setBusinessAccountName(first_name, other, signal) {
      return this.api.setBusinessAccountName(orThrow(this.businessConnectionId, "setBusinessAccountName"), first_name, other, signal);
    }
    setBusinessAccountUsername(username, signal) {
      return this.api.setBusinessAccountUsername(orThrow(this.businessConnectionId, "setBusinessAccountUsername"), username, signal);
    }
    setBusinessAccountBio(bio, signal) {
      return this.api.setBusinessAccountBio(orThrow(this.businessConnectionId, "setBusinessAccountBio"), bio, signal);
    }
    setBusinessAccountProfilePhoto(photo, other, signal) {
      return this.api.setBusinessAccountProfilePhoto(orThrow(this.businessConnectionId, "setBusinessAccountProfilePhoto"), photo, other, signal);
    }
    removeBusinessAccountProfilePhoto(other, signal) {
      return this.api.removeBusinessAccountProfilePhoto(orThrow(this.businessConnectionId, "removeBusinessAccountProfilePhoto"), other, signal);
    }
    setBusinessAccountGiftSettings(show_gift_button, accepted_gift_types, signal) {
      return this.api.setBusinessAccountGiftSettings(orThrow(this.businessConnectionId, "setBusinessAccountGiftSettings"), show_gift_button, accepted_gift_types, signal);
    }
    getBusinessAccountStarBalance(signal) {
      return this.api.getBusinessAccountStarBalance(orThrow(this.businessConnectionId, "getBusinessAccountStarBalance"), signal);
    }
    transferBusinessAccountStars(star_count, signal) {
      return this.api.transferBusinessAccountStars(orThrow(this.businessConnectionId, "transferBusinessAccountStars"), star_count, signal);
    }
    getBusinessAccountGifts(other, signal) {
      return this.api.getBusinessAccountGifts(orThrow(this.businessConnectionId, "getBusinessAccountGifts"), other, signal);
    }
    convertGiftToStars(owned_gift_id, signal) {
      return this.api.convertGiftToStars(orThrow(this.businessConnectionId, "convertGiftToStars"), owned_gift_id, signal);
    }
    upgradeGift(owned_gift_id, other, signal) {
      return this.api.upgradeGift(orThrow(this.businessConnectionId, "upgradeGift"), owned_gift_id, other, signal);
    }
    transferGift(owned_gift_id, new_owner_chat_id, star_count, signal) {
      return this.api.transferGift(orThrow(this.businessConnectionId, "transferGift"), owned_gift_id, new_owner_chat_id, star_count, signal);
    }
    postStory(content, active_period, other, signal) {
      return this.api.postStory(orThrow(this.businessConnectionId, "postStory"), content, active_period, other, signal);
    }
    repostStory(active_period, other, signal) {
      var _a;
      const story = orThrow((_a = this.msg) === null || _a === undefined ? undefined : _a.story, "repostStory");
      return this.api.repostStory(orThrow(this.businessConnectionId, "repostStory"), story.chat.id, story.id, active_period, other, signal);
    }
    editStory(story_id, content, other, signal) {
      return this.api.editStory(orThrow(this.businessConnectionId, "editStory"), story_id, content, other, signal);
    }
    deleteStory(story_id, signal) {
      return this.api.deleteStory(orThrow(this.businessConnectionId, "deleteStory"), story_id, signal);
    }
    replyWithSticker(sticker, other, signal) {
      var _a;
      const msg = this.msg;
      return this.api.sendSticker(orThrow(this.chatId, "sendSticker"), sticker, {
        business_connection_id: this.businessConnectionId,
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        direct_messages_topic_id: (_a = msg === null || msg === undefined ? undefined : msg.direct_messages_topic) === null || _a === undefined ? undefined : _a.topic_id,
        ...other
      }, signal);
    }
    getCustomEmojiStickers(signal) {
      var _a, _b;
      return this.api.getCustomEmojiStickers(((_b = (_a = this.msg) === null || _a === undefined ? undefined : _a.entities) !== null && _b !== undefined ? _b : []).filter((e) => e.type === "custom_emoji").map((e) => e.custom_emoji_id), signal);
    }
    replyWithGift(gift_id, other, signal) {
      return this.api.sendGift(orThrow(this.from, "sendGift").id, gift_id, other, signal);
    }
    giftPremiumSubscription(month_count, star_count, other, signal) {
      return this.api.giftPremiumSubscription(orThrow(this.from, "giftPremiumSubscription").id, month_count, star_count, other, signal);
    }
    replyWithGiftToChannel(gift_id, other, signal) {
      return this.api.sendGiftToChannel(orThrow(this.chat, "sendGift").id, gift_id, other, signal);
    }
    answerInlineQuery(results, other, signal) {
      return this.api.answerInlineQuery(orThrow(this.inlineQuery, "answerInlineQuery").id, results, other, signal);
    }
    savePreparedInlineMessage(result, other, signal) {
      return this.api.savePreparedInlineMessage(orThrow(this.from, "savePreparedInlineMessage").id, result, other, signal);
    }
    savePreparedKeyboardButton(button, signal) {
      return this.api.savePreparedKeyboardButton(orThrow(this.from, "savePreparedKeyboardButton").id, button, signal);
    }
    replyWithInvoice(title, description, payload, currency, prices, other, signal) {
      var _a;
      const msg = this.msg;
      return this.api.sendInvoice(orThrow(this.chatId, "sendInvoice"), title, description, payload, currency, prices, {
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        direct_messages_topic_id: (_a = msg === null || msg === undefined ? undefined : msg.direct_messages_topic) === null || _a === undefined ? undefined : _a.topic_id,
        ...other
      }, signal);
    }
    answerShippingQuery(ok, other, signal) {
      return this.api.answerShippingQuery(orThrow(this.shippingQuery, "answerShippingQuery").id, ok, other, signal);
    }
    answerPreCheckoutQuery(ok, other, signal) {
      return this.api.answerPreCheckoutQuery(orThrow(this.preCheckoutQuery, "answerPreCheckoutQuery").id, ok, typeof other === "string" ? { error_message: other } : other, signal);
    }
    refundStarPayment(signal) {
      var _a;
      return this.api.refundStarPayment(orThrow(this.from, "refundStarPayment").id, orThrow((_a = this.msg) === null || _a === undefined ? undefined : _a.successful_payment, "refundStarPayment").telegram_payment_charge_id, signal);
    }
    editUserStarSubscription(telegram_payment_charge_id, is_canceled, signal) {
      return this.api.editUserStarSubscription(orThrow(this.from, "editUserStarSubscription").id, telegram_payment_charge_id, is_canceled, signal);
    }
    verifyUser(other, signal) {
      return this.api.verifyUser(orThrow(this.from, "verifyUser").id, other, signal);
    }
    verifyChat(other, signal) {
      return this.api.verifyChat(orThrow(this.chatId, "verifyChat"), other, signal);
    }
    removeUserVerification(signal) {
      return this.api.removeUserVerification(orThrow(this.from, "removeUserVerification").id, signal);
    }
    removeChatVerification(signal) {
      return this.api.removeChatVerification(orThrow(this.chatId, "removeChatVerification"), signal);
    }
    readBusinessMessage(signal) {
      return this.api.readBusinessMessage(orThrow(this.businessConnectionId, "readBusinessMessage"), orThrow(this.chatId, "readBusinessMessage"), orThrow(this.msgId, "readBusinessMessage"), signal);
    }
    setPassportDataErrors(errors, signal) {
      return this.api.setPassportDataErrors(orThrow(this.from, "setPassportDataErrors").id, errors, signal);
    }
    replyWithGame(game_short_name, other, signal) {
      const msg = this.msg;
      return this.api.sendGame(orThrow(this.chatId, "sendGame"), game_short_name, {
        business_connection_id: this.businessConnectionId,
        ...(msg === null || msg === undefined ? undefined : msg.is_topic_message) ? { message_thread_id: msg.message_thread_id } : {},
        ...other
      }, signal);
    }
  }
  exports.Context = Context;
  Context.has = checker;
  function orThrow(value, method) {
    if (value === undefined) {
      throw new Error(`Missing information for API call to ${method}`);
    }
    return value;
  }
  function triggerFn(trigger) {
    return toArray(trigger).map((t) => typeof t === "string" ? (txt) => txt === t ? t : null : (txt) => txt.match(t));
  }
  function match(ctx, content, triggers) {
    for (const t of triggers) {
      const res = t(content);
      if (res) {
        ctx.match = res;
        return true;
      }
    }
    return false;
  }
  function toArray(e) {
    return Array.isArray(e) ? e : [e];
  }
});

// node_modules/grammy/out/composer.js
var require_composer = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.Composer = exports.BotError = undefined;
  exports.run = run;
  var context_js_1 = require_context();

  class BotError extends Error {
    constructor(error, ctx) {
      super(generateBotErrorMessage(error));
      this.error = error;
      this.ctx = ctx;
      this.name = "BotError";
      if (error instanceof Error)
        this.stack = error.stack;
    }
  }
  exports.BotError = BotError;
  function generateBotErrorMessage(error) {
    let msg;
    if (error instanceof Error) {
      msg = `${error.name} in middleware: ${error.message}`;
    } else {
      const type = typeof error;
      msg = `Non-error value of type ${type} thrown in middleware`;
      switch (type) {
        case "bigint":
        case "boolean":
        case "number":
        case "symbol":
          msg += `: ${error}`;
          break;
        case "string":
          msg += `: ${String(error).substring(0, 50)}`;
          break;
        default:
          msg += "!";
          break;
      }
    }
    return msg;
  }
  function flatten(mw) {
    return typeof mw === "function" ? mw : (ctx, next) => mw.middleware()(ctx, next);
  }
  function concat(first, andThen) {
    return async (ctx, next) => {
      let nextCalled = false;
      await first(ctx, async () => {
        if (nextCalled)
          throw new Error("`next` already called before!");
        else
          nextCalled = true;
        await andThen(ctx, next);
      });
    };
  }
  function pass(_ctx, next) {
    return next();
  }
  var leaf = () => Promise.resolve();
  async function run(middleware, ctx) {
    await middleware(ctx, leaf);
  }

  class Composer {
    constructor(...middleware) {
      this.handler = middleware.length === 0 ? pass : middleware.map(flatten).reduce(concat);
    }
    middleware() {
      return this.handler;
    }
    use(...middleware) {
      const composer = new Composer(...middleware);
      this.handler = concat(this.handler, flatten(composer));
      return composer;
    }
    on(filter, ...middleware) {
      return this.filter(context_js_1.Context.has.filterQuery(filter), ...middleware);
    }
    hears(trigger, ...middleware) {
      return this.filter(context_js_1.Context.has.text(trigger), ...middleware);
    }
    command(command, ...middleware) {
      return this.filter(context_js_1.Context.has.command(command), ...middleware);
    }
    reaction(reaction, ...middleware) {
      return this.filter(context_js_1.Context.has.reaction(reaction), ...middleware);
    }
    chatType(chatType, ...middleware) {
      return this.filter(context_js_1.Context.has.chatType(chatType), ...middleware);
    }
    callbackQuery(trigger, ...middleware) {
      return this.filter(context_js_1.Context.has.callbackQuery(trigger), ...middleware);
    }
    gameQuery(trigger, ...middleware) {
      return this.filter(context_js_1.Context.has.gameQuery(trigger), ...middleware);
    }
    inlineQuery(trigger, ...middleware) {
      return this.filter(context_js_1.Context.has.inlineQuery(trigger), ...middleware);
    }
    chosenInlineResult(resultId, ...middleware) {
      return this.filter(context_js_1.Context.has.chosenInlineResult(resultId), ...middleware);
    }
    preCheckoutQuery(trigger, ...middleware) {
      return this.filter(context_js_1.Context.has.preCheckoutQuery(trigger), ...middleware);
    }
    shippingQuery(trigger, ...middleware) {
      return this.filter(context_js_1.Context.has.shippingQuery(trigger), ...middleware);
    }
    filter(predicate, ...middleware) {
      const composer = new Composer(...middleware);
      this.branch(predicate, composer, pass);
      return composer;
    }
    drop(predicate, ...middleware) {
      return this.filter(async (ctx) => !await predicate(ctx), ...middleware);
    }
    fork(...middleware) {
      const composer = new Composer(...middleware);
      const fork = flatten(composer);
      this.use((ctx, next) => Promise.all([next(), run(fork, ctx)]));
      return composer;
    }
    lazy(middlewareFactory) {
      return this.use(async (ctx, next) => {
        const middleware = await middlewareFactory(ctx);
        const arr = Array.isArray(middleware) ? middleware : [middleware];
        await flatten(new Composer(...arr))(ctx, next);
      });
    }
    route(router, routeHandlers, fallback = pass) {
      return this.lazy(async (ctx) => {
        var _a;
        const route = await router(ctx);
        return (_a = route === undefined || !routeHandlers[route] ? fallback : routeHandlers[route]) !== null && _a !== undefined ? _a : [];
      });
    }
    branch(predicate, trueMiddleware, falseMiddleware) {
      return this.lazy(async (ctx) => await predicate(ctx) ? trueMiddleware : falseMiddleware);
    }
    errorBoundary(errorHandler, ...middleware) {
      const composer = new Composer(...middleware);
      const bound = flatten(composer);
      this.use(async (ctx, next) => {
        let nextCalled = false;
        const cont = () => (nextCalled = true, Promise.resolve());
        try {
          await bound(ctx, cont);
        } catch (err) {
          nextCalled = false;
          await errorHandler(new BotError(err, ctx), cont);
        }
        if (nextCalled)
          await next();
      });
      return composer;
    }
  }
  exports.Composer = Composer;
});

// node_modules/ms/index.js
var require_ms = __commonJS(function(exports, module) {
  var s = 1000;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var w = d * 7;
  var y = d * 365.25;
  module.exports = function(val, options) {
    options = options || {};
    var type = typeof val;
    if (type === "string" && val.length > 0) {
      return parse(val);
    } else if (type === "number" && isFinite(val)) {
      return options.long ? fmtLong(val) : fmtShort(val);
    }
    throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(val));
  };
  function parse(str) {
    str = String(str);
    if (str.length > 100) {
      return;
    }
    var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(str);
    if (!match) {
      return;
    }
    var n = parseFloat(match[1]);
    var type = (match[2] || "ms").toLowerCase();
    switch (type) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return n * y;
      case "weeks":
      case "week":
      case "w":
        return n * w;
      case "days":
      case "day":
      case "d":
        return n * d;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return n * h;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return n * m;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return n * s;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return n;
      default:
        return;
    }
  }
  function fmtShort(ms) {
    var msAbs = Math.abs(ms);
    if (msAbs >= d) {
      return Math.round(ms / d) + "d";
    }
    if (msAbs >= h) {
      return Math.round(ms / h) + "h";
    }
    if (msAbs >= m) {
      return Math.round(ms / m) + "m";
    }
    if (msAbs >= s) {
      return Math.round(ms / s) + "s";
    }
    return ms + "ms";
  }
  function fmtLong(ms) {
    var msAbs = Math.abs(ms);
    if (msAbs >= d) {
      return plural(ms, msAbs, d, "day");
    }
    if (msAbs >= h) {
      return plural(ms, msAbs, h, "hour");
    }
    if (msAbs >= m) {
      return plural(ms, msAbs, m, "minute");
    }
    if (msAbs >= s) {
      return plural(ms, msAbs, s, "second");
    }
    return ms + " ms";
  }
  function plural(ms, msAbs, n, name) {
    var isPlural = msAbs >= n * 1.5;
    return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
  }
});

// node_modules/debug/src/common.js
var require_common = __commonJS(function(exports, module) {
  function setup(env) {
    createDebug.debug = createDebug;
    createDebug.default = createDebug;
    createDebug.coerce = coerce;
    createDebug.disable = disable;
    createDebug.enable = enable;
    createDebug.enabled = enabled;
    createDebug.humanize = require_ms();
    createDebug.destroy = destroy;
    Object.keys(env).forEach((key) => {
      createDebug[key] = env[key];
    });
    createDebug.names = [];
    createDebug.skips = [];
    createDebug.formatters = {};
    function selectColor(namespace) {
      let hash = 0;
      for (let i = 0;i < namespace.length; i++) {
        hash = (hash << 5) - hash + namespace.charCodeAt(i);
        hash |= 0;
      }
      return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
    }
    createDebug.selectColor = selectColor;
    function createDebug(namespace) {
      let prevTime;
      let enableOverride = null;
      let namespacesCache;
      let enabledCache;
      function debug(...args) {
        if (!debug.enabled) {
          return;
        }
        const self = debug;
        const curr = Number(new Date);
        const ms = curr - (prevTime || curr);
        self.diff = ms;
        self.prev = prevTime;
        self.curr = curr;
        prevTime = curr;
        args[0] = createDebug.coerce(args[0]);
        if (typeof args[0] !== "string") {
          args.unshift("%O");
        }
        let index = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
          if (match === "%%") {
            return "%";
          }
          index++;
          const formatter = createDebug.formatters[format];
          if (typeof formatter === "function") {
            const val = args[index];
            match = formatter.call(self, val);
            args.splice(index, 1);
            index--;
          }
          return match;
        });
        createDebug.formatArgs.call(self, args);
        const logFn = self.log || createDebug.log;
        logFn.apply(self, args);
      }
      debug.namespace = namespace;
      debug.useColors = createDebug.useColors();
      debug.color = createDebug.selectColor(namespace);
      debug.extend = extend;
      debug.destroy = createDebug.destroy;
      Object.defineProperty(debug, "enabled", {
        enumerable: true,
        configurable: false,
        get: () => {
          if (enableOverride !== null) {
            return enableOverride;
          }
          if (namespacesCache !== createDebug.namespaces) {
            namespacesCache = createDebug.namespaces;
            enabledCache = createDebug.enabled(namespace);
          }
          return enabledCache;
        },
        set: (v) => {
          enableOverride = v;
        }
      });
      if (typeof createDebug.init === "function") {
        createDebug.init(debug);
      }
      return debug;
    }
    function extend(namespace, delimiter) {
      const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
      newDebug.log = this.log;
      return newDebug;
    }
    function enable(namespaces) {
      createDebug.save(namespaces);
      createDebug.namespaces = namespaces;
      createDebug.names = [];
      createDebug.skips = [];
      const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const ns of split) {
        if (ns[0] === "-") {
          createDebug.skips.push(ns.slice(1));
        } else {
          createDebug.names.push(ns);
        }
      }
    }
    function matchesTemplate(search, template) {
      let searchIndex = 0;
      let templateIndex = 0;
      let starIndex = -1;
      let matchIndex = 0;
      while (searchIndex < search.length) {
        if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
          if (template[templateIndex] === "*") {
            starIndex = templateIndex;
            matchIndex = searchIndex;
            templateIndex++;
          } else {
            searchIndex++;
            templateIndex++;
          }
        } else if (starIndex !== -1) {
          templateIndex = starIndex + 1;
          matchIndex++;
          searchIndex = matchIndex;
        } else {
          return false;
        }
      }
      while (templateIndex < template.length && template[templateIndex] === "*") {
        templateIndex++;
      }
      return templateIndex === template.length;
    }
    function disable() {
      const namespaces = [
        ...createDebug.names,
        ...createDebug.skips.map((namespace) => "-" + namespace)
      ].join(",");
      createDebug.enable("");
      return namespaces;
    }
    function enabled(name) {
      for (const skip of createDebug.skips) {
        if (matchesTemplate(name, skip)) {
          return false;
        }
      }
      for (const ns of createDebug.names) {
        if (matchesTemplate(name, ns)) {
          return true;
        }
      }
      return false;
    }
    function coerce(val) {
      if (val instanceof Error) {
        return val.stack || val.message;
      }
      return val;
    }
    function destroy() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    createDebug.enable(createDebug.load());
    return createDebug;
  }
  module.exports = setup;
});

// node_modules/debug/src/browser.js
var require_browser = __commonJS(function(exports, module) {
  exports.formatArgs = formatArgs;
  exports.save = save;
  exports.load = load;
  exports.useColors = useColors;
  exports.storage = localstorage();
  exports.destroy = (() => {
    let warned = false;
    return () => {
      if (!warned) {
        warned = true;
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
    };
  })();
  exports.colors = [
    "#0000CC",
    "#0000FF",
    "#0033CC",
    "#0033FF",
    "#0066CC",
    "#0066FF",
    "#0099CC",
    "#0099FF",
    "#00CC00",
    "#00CC33",
    "#00CC66",
    "#00CC99",
    "#00CCCC",
    "#00CCFF",
    "#3300CC",
    "#3300FF",
    "#3333CC",
    "#3333FF",
    "#3366CC",
    "#3366FF",
    "#3399CC",
    "#3399FF",
    "#33CC00",
    "#33CC33",
    "#33CC66",
    "#33CC99",
    "#33CCCC",
    "#33CCFF",
    "#6600CC",
    "#6600FF",
    "#6633CC",
    "#6633FF",
    "#66CC00",
    "#66CC33",
    "#9900CC",
    "#9900FF",
    "#9933CC",
    "#9933FF",
    "#99CC00",
    "#99CC33",
    "#CC0000",
    "#CC0033",
    "#CC0066",
    "#CC0099",
    "#CC00CC",
    "#CC00FF",
    "#CC3300",
    "#CC3333",
    "#CC3366",
    "#CC3399",
    "#CC33CC",
    "#CC33FF",
    "#CC6600",
    "#CC6633",
    "#CC9900",
    "#CC9933",
    "#CCCC00",
    "#CCCC33",
    "#FF0000",
    "#FF0033",
    "#FF0066",
    "#FF0099",
    "#FF00CC",
    "#FF00FF",
    "#FF3300",
    "#FF3333",
    "#FF3366",
    "#FF3399",
    "#FF33CC",
    "#FF33FF",
    "#FF6600",
    "#FF6633",
    "#FF9900",
    "#FF9933",
    "#FFCC00",
    "#FFCC33"
  ];
  function useColors() {
    if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
      return true;
    }
    if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
      return false;
    }
    let m;
    return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
  }
  function formatArgs(args) {
    args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
    if (!this.useColors) {
      return;
    }
    const c = "color: " + this.color;
    args.splice(1, 0, c, "color: inherit");
    let index = 0;
    let lastC = 0;
    args[0].replace(/%[a-zA-Z%]/g, (match) => {
      if (match === "%%") {
        return;
      }
      index++;
      if (match === "%c") {
        lastC = index;
      }
    });
    args.splice(lastC, 0, c);
  }
  exports.log = console.debug || console.log || (() => {});
  function save(namespaces) {
    try {
      if (namespaces) {
        exports.storage.setItem("debug", namespaces);
      } else {
        exports.storage.removeItem("debug");
      }
    } catch (error) {}
  }
  function load() {
    let r;
    try {
      r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
    } catch (error) {}
    if (!r && typeof process !== "undefined" && "env" in process) {
      r = process.env.DEBUG;
    }
    return r;
  }
  function localstorage() {
    try {
      return localStorage;
    } catch (error) {}
  }
  module.exports = require_common()(exports);
  var { formatters } = module.exports;
  formatters.j = function(v) {
    try {
      return JSON.stringify(v);
    } catch (error) {
      return "[UnexpectedJSONParseError]: " + error.message;
    }
  };
});

// node_modules/debug/src/node.js
var require_node = __commonJS(function(exports, module) {
  var tty = __require("tty");
  var util = __require("util");
  exports.init = init;
  exports.log = log;
  exports.formatArgs = formatArgs;
  exports.save = save;
  exports.load = load;
  exports.useColors = useColors;
  exports.destroy = util.deprecate(() => {}, "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
  exports.colors = [6, 2, 3, 4, 5, 1];
  try {
    const supportsColor = (()=>{throw new Error("Cannot require module "+"supports-color");})();
    if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
      exports.colors = [
        20,
        21,
        26,
        27,
        32,
        33,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        56,
        57,
        62,
        63,
        68,
        69,
        74,
        75,
        76,
        77,
        78,
        79,
        80,
        81,
        92,
        93,
        98,
        99,
        112,
        113,
        128,
        129,
        134,
        135,
        148,
        149,
        160,
        161,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        171,
        172,
        173,
        178,
        179,
        184,
        185,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        203,
        204,
        205,
        206,
        207,
        208,
        209,
        214,
        215,
        220,
        221
      ];
    }
  } catch (error) {}
  exports.inspectOpts = Object.keys(process.env).filter((key) => {
    return /^debug_/i.test(key);
  }).reduce((obj, key) => {
    const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
      return k.toUpperCase();
    });
    let val = process.env[key];
    if (/^(yes|on|true|enabled)$/i.test(val)) {
      val = true;
    } else if (/^(no|off|false|disabled)$/i.test(val)) {
      val = false;
    } else if (val === "null") {
      val = null;
    } else {
      val = Number(val);
    }
    obj[prop] = val;
    return obj;
  }, {});
  function useColors() {
    return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
  }
  function formatArgs(args) {
    const { namespace: name, useColors: useColors2 } = this;
    if (useColors2) {
      const c = this.color;
      const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
      const prefix = `  ${colorCode};1m${name} \x1B[0m`;
      args[0] = prefix + args[0].split(`
`).join(`
` + prefix);
      args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
    } else {
      args[0] = getDate() + name + " " + args[0];
    }
  }
  function getDate() {
    if (exports.inspectOpts.hideDate) {
      return "";
    }
    return new Date().toISOString() + " ";
  }
  function log(...args) {
    return process.stderr.write(util.formatWithOptions(exports.inspectOpts, ...args) + `
`);
  }
  function save(namespaces) {
    if (namespaces) {
      process.env.DEBUG = namespaces;
    } else {
      delete process.env.DEBUG;
    }
  }
  function load() {
    return process.env.DEBUG;
  }
  function init(debug) {
    debug.inspectOpts = {};
    const keys = Object.keys(exports.inspectOpts);
    for (let i = 0;i < keys.length; i++) {
      debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
    }
  }
  module.exports = require_common()(exports);
  var { formatters } = module.exports;
  formatters.o = function(v) {
    this.inspectOpts.colors = this.useColors;
    return util.inspect(v, this.inspectOpts).split(`
`).map((str) => str.trim()).join(" ");
  };
  formatters.O = function(v) {
    this.inspectOpts.colors = this.useColors;
    return util.inspect(v, this.inspectOpts);
  };
});

// node_modules/debug/src/index.js
var require_src = __commonJS(function(exports, module) {
  if (typeof process === "undefined" || process.type === "renderer" || false || process.__nwjs) {
    module.exports = require_browser();
  } else {
    module.exports = require_node();
  }
});

// node_modules/grammy/out/platform.node.js
var require_platform_node = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.defaultAdapter = exports.itrToStream = exports.debug = undefined;
  exports.baseFetchConfig = baseFetchConfig;
  var http_1 = __require("http");
  var https_1 = __require("https");
  var stream_1 = __require("stream");
  var debug_1 = require_src();
  Object.defineProperty(exports, "debug", { enumerable: true, get: function() {
    return debug_1.debug;
  } });
  var itrToStream = (itr) => stream_1.Readable.from(itr, { objectMode: false });
  exports.itrToStream = itrToStream;
  var httpAgents = new Map;
  var httpsAgents = new Map;
  function getCached(map, key, otherwise) {
    let value = map.get(key);
    if (value === undefined) {
      value = otherwise();
      map.set(key, value);
    }
    return value;
  }
  function baseFetchConfig(apiRoot) {
    if (apiRoot.startsWith("https:")) {
      return {
        compress: true,
        agent: getCached(httpsAgents, apiRoot, () => new https_1.Agent({ keepAlive: true })),
        duplex: "half"
      };
    } else if (apiRoot.startsWith("http:")) {
      return {
        agent: getCached(httpAgents, apiRoot, () => new http_1.Agent({ keepAlive: true })),
        duplex: "half"
      };
    } else
      return { duplex: "half" };
  }
  exports.defaultAdapter = "express";
});

// node_modules/grammy/out/core/error.js
var require_error = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.HttpError = exports.GrammyError = undefined;
  exports.toGrammyError = toGrammyError;
  exports.toHttpError = toHttpError;
  var platform_node_js_1 = require_platform_node();
  var debug = (0, platform_node_js_1.debug)("grammy:warn");

  class GrammyError extends Error {
    constructor(message, err, method, payload) {
      var _a;
      super(`${message} (${err.error_code}: ${err.description})`);
      this.method = method;
      this.payload = payload;
      this.ok = false;
      this.name = "GrammyError";
      this.error_code = err.error_code;
      this.description = err.description;
      this.parameters = (_a = err.parameters) !== null && _a !== undefined ? _a : {};
    }
  }
  exports.GrammyError = GrammyError;
  function toGrammyError(err, method, payload) {
    switch (err.error_code) {
      case 401:
        debug("Error 401 means that your bot token is wrong, talk to https://t.me/BotFather to check it.");
        break;
      case 409:
        debug("Error 409 means that you are running your bot several times on long polling. Consider revoking the bot token if you believe that no other instance is running.");
        break;
    }
    return new GrammyError(`Call to '${method}' failed!`, err, method, payload);
  }

  class HttpError extends Error {
    constructor(message, error) {
      super(message);
      this.error = error;
      this.name = "HttpError";
    }
  }
  exports.HttpError = HttpError;
  function isTelegramError(err) {
    return typeof err === "object" && err !== null && "status" in err && "statusText" in err;
  }
  function toHttpError(method, sensitiveLogs, err) {
    let msg = `Network request for '${method}' failed!`;
    if (isTelegramError(err))
      msg += ` (${err.status}: ${err.statusText})`;
    if (sensitiveLogs && err instanceof Error)
      msg += ` ${err.message}`;
    return new HttpError(msg, err);
  }
});

// node_modules/@grammyjs/types/mod.js
var exports_mod = {};

// node_modules/grammy/out/types.node.js
var require_types_node = __commonJS(function(exports) {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    o[k2] = m[k];
  });
  var __exportStar = exports && exports.__exportStar || function(m, exports2) {
    for (var p in m)
      if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p))
        __createBinding(exports2, m, p);
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.InputFile = undefined;
  var fs_1 = __require("fs");
  var node_fetch_1 = __require("node-fetch");
  var path_1 = __require("path");
  var platform_node_1 = require_platform_node();
  var debug = (0, platform_node_1.debug)("grammy:warn");
  __exportStar(__toCommonJS(exports_mod), exports);

  class InputFile {
    constructor(file, filename) {
      this.consumed = false;
      this.fileData = file;
      filename !== null && filename !== undefined || (filename = this.guessFilename(file));
      this.filename = filename;
      if (typeof file === "string" && (file.startsWith("http:") || file.startsWith("https:"))) {
        debug(`InputFile received the local file path '${file}' that looks like a URL. Is this a mistake?`);
      }
    }
    guessFilename(file) {
      if (typeof file === "string")
        return (0, path_1.basename)(file);
      if ("url" in file)
        return (0, path_1.basename)(file.url);
      if (!(file instanceof URL))
        return;
      if (file.pathname !== "/") {
        const filename = (0, path_1.basename)(file.pathname);
        if (filename)
          return filename;
      }
      return (0, path_1.basename)(file.hostname);
    }
    async toRaw() {
      if (this.consumed) {
        throw new Error("Cannot reuse InputFile data source!");
      }
      const data = this.fileData;
      if (typeof data === "string")
        return (0, fs_1.createReadStream)(data);
      if (data instanceof URL) {
        return data.protocol === "file" ? (0, fs_1.createReadStream)(data.pathname) : fetchFile(data);
      }
      if ("url" in data)
        return fetchFile(data.url);
      if (data instanceof Uint8Array)
        return data;
      if (typeof data === "function") {
        return new InputFile(await data()).toRaw();
      }
      this.consumed = true;
      return data;
    }
    toJSON() {
      throw new Error("InputFile instances must be sent via grammY");
    }
  }
  exports.InputFile = InputFile;
  async function* fetchFile(url) {
    const { body } = await (0, node_fetch_1.default)(url);
    for await (const chunk of body) {
      if (typeof chunk === "string") {
        throw new Error(`Could not transfer file, received string data instead of bytes from '${url}'`);
      }
      yield chunk;
    }
  }
});

// node_modules/grammy/out/types.js
var require_types = __commonJS(function(exports) {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    o[k2] = m[k];
  });
  var __exportStar = exports && exports.__exportStar || function(m, exports2) {
    for (var p in m)
      if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p))
        __createBinding(exports2, m, p);
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  __exportStar(require_types_node(), exports);
});

// node_modules/grammy/out/core/payload.js
var require_payload = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.requiresFormDataUpload = requiresFormDataUpload;
  exports.createJsonPayload = createJsonPayload;
  exports.createFormDataPayload = createFormDataPayload;
  var platform_node_js_1 = require_platform_node();
  var types_js_1 = require_types();
  function requiresFormDataUpload(payload) {
    return payload instanceof types_js_1.InputFile || typeof payload === "object" && payload !== null && Object.values(payload).some((v) => Array.isArray(v) ? v.some(requiresFormDataUpload) : v instanceof types_js_1.InputFile || requiresFormDataUpload(v));
  }
  function str(value) {
    return JSON.stringify(value, (_, v) => v !== null && v !== undefined ? v : undefined);
  }
  function createJsonPayload(payload) {
    return {
      method: "POST",
      headers: {
        "content-type": "application/json",
        connection: "keep-alive"
      },
      body: str(payload)
    };
  }
  async function* protectItr(itr, onError) {
    try {
      yield* itr;
    } catch (err) {
      onError(err);
    }
  }
  function createFormDataPayload(payload, onError) {
    const boundary = createBoundary();
    const itr = payloadToMultipartItr(payload, boundary);
    const safeItr = protectItr(itr, onError);
    const stream = (0, platform_node_js_1.itrToStream)(safeItr);
    return {
      method: "POST",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
        connection: "keep-alive"
      },
      body: stream
    };
  }
  function createBoundary() {
    return "----------" + randomId(32);
  }
  function randomId(length = 16) {
    return Array.from(Array(length)).map(() => Math.random().toString(36)[2] || 0).join("");
  }
  var enc = new TextEncoder;
  async function* payloadToMultipartItr(payload, boundary) {
    const files = collectFiles(payload);
    yield enc.encode(`--${boundary}\r
`);
    const separator = enc.encode(`\r
--${boundary}\r
`);
    let first = true;
    for (const [key, value] of Object.entries(payload)) {
      if (value == null)
        continue;
      if (!first)
        yield separator;
      yield valuePart(key, value instanceof types_js_1.InputFile ? value.toJSON() : typeof value === "object" ? str(value) : value);
      first = false;
    }
    for (const { id, origin, file } of files) {
      if (!first)
        yield separator;
      yield* filePart(id, origin, file);
      first = false;
    }
    yield enc.encode(`\r
--${boundary}--\r
`);
  }
  function collectFiles(value) {
    if (typeof value !== "object" || value === null)
      return [];
    return Object.entries(value).flatMap(([k, v]) => {
      if (Array.isArray(v))
        return v.flatMap((p) => collectFiles(p));
      else if (v instanceof types_js_1.InputFile) {
        const id = randomId();
        Object.assign(v, { toJSON: () => `attach://${id}` });
        const origin = k === "media" && "type" in value && typeof value.type === "string" ? value.type : k;
        return { id, origin, file: v };
      } else
        return collectFiles(v);
    });
  }
  function valuePart(key, value) {
    return enc.encode(`content-disposition:form-data;name="${key}"\r
\r
${value}`);
  }
  async function* filePart(id, origin, input) {
    const filename = input.filename || `${origin}.${getExt(origin)}`;
    if (filename.includes("\r") || filename.includes(`
`)) {
      throw new Error(`File paths cannot contain carriage-return (\\r) or newline (\\n) characters! Filename for property '${origin}' was:
"""
${filename}
"""`);
    }
    yield enc.encode(`content-disposition:form-data;name="${id}";filename=${filename}\r
content-type:application/octet-stream\r
\r
`);
    const data = await input.toRaw();
    if (data instanceof Uint8Array)
      yield data;
    else
      yield* data;
  }
  function getExt(key) {
    switch (key) {
      case "certificate":
        return "pem";
      case "photo":
      case "thumbnail":
        return "jpg";
      case "voice":
        return "ogg";
      case "audio":
        return "mp3";
      case "animation":
      case "video":
      case "video_note":
        return "mp4";
      case "sticker":
        return "webp";
      default:
        return "dat";
    }
  }
});

// node_modules/grammy/out/shim.node.js
var require_shim_node = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.fetch = exports.AbortController = undefined;
  var abort_controller_1 = __require("abort-controller");
  Object.defineProperty(exports, "AbortController", { enumerable: true, get: function() {
    return abort_controller_1.AbortController;
  } });
  var node_fetch_1 = __require("node-fetch");
  Object.defineProperty(exports, "fetch", { enumerable: true, get: function() {
    return node_fetch_1.default;
  } });
});

// node_modules/grammy/out/core/client.js
var require_client = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.createRawApi = createRawApi;
  var platform_node_js_1 = require_platform_node();
  var error_js_1 = require_error();
  var payload_js_1 = require_payload();
  var debug = (0, platform_node_js_1.debug)("grammy:core");
  function concatTransformer(prev, trans) {
    return (method, payload, signal) => trans(prev, method, payload, signal);
  }

  class ApiClient {
    constructor(token, options = {}, webhookReplyEnvelope = {}) {
      var _a, _b, _c, _d, _e, _f;
      this.token = token;
      this.webhookReplyEnvelope = webhookReplyEnvelope;
      this.hasUsedWebhookReply = false;
      this.installedTransformers = [];
      this.call = async (method, p, signal) => {
        const payload = p !== null && p !== undefined ? p : {};
        debug(`Calling ${method}`);
        if (signal !== undefined)
          validateSignal(method, payload, signal);
        const opts = this.options;
        const formDataRequired = (0, payload_js_1.requiresFormDataUpload)(payload);
        if (this.webhookReplyEnvelope.send !== undefined && !this.hasUsedWebhookReply && !formDataRequired && opts.canUseWebhookReply(method)) {
          this.hasUsedWebhookReply = true;
          const config2 = (0, payload_js_1.createJsonPayload)({ ...payload, method });
          await this.webhookReplyEnvelope.send(config2.body);
          return { ok: true, result: true };
        }
        const { controller, unregisterSignal } = createAbortControllerFromSignal(signal);
        const timeout = createTimeout(controller, opts.timeoutSeconds, method);
        const streamErr = createStreamError(controller);
        const url = opts.buildUrl(opts.apiRoot, this.token, method, opts.environment);
        const config = formDataRequired ? (0, payload_js_1.createFormDataPayload)(payload, (err) => streamErr.catch(err)) : (0, payload_js_1.createJsonPayload)(payload);
        const sig = controller.signal;
        const options2 = { ...opts.baseFetchConfig, signal: sig, ...config };
        const successPromise = this.fetch(url, options2).then((res) => res.json());
        const operations = [successPromise, streamErr.promise, timeout.promise];
        try {
          return await Promise.race(operations);
        } catch (error) {
          throw (0, error_js_1.toHttpError)(method, opts.sensitiveLogs, error);
        } finally {
          if (timeout.handle !== undefined)
            clearTimeout(timeout.handle);
          unregisterSignal === null || unregisterSignal === undefined || unregisterSignal();
        }
      };
      const apiRoot = (_a = options.apiRoot) !== null && _a !== undefined ? _a : "https://api.telegram.org";
      const environment = (_b = options.environment) !== null && _b !== undefined ? _b : "prod";
      const { fetch: customFetch } = options;
      const fetchFn = customFetch !== null && customFetch !== undefined ? customFetch : shim_node_js_1.fetch;
      this.options = {
        apiRoot,
        environment,
        buildUrl: (_c = options.buildUrl) !== null && _c !== undefined ? _c : defaultBuildUrl,
        timeoutSeconds: (_d = options.timeoutSeconds) !== null && _d !== undefined ? _d : 500,
        baseFetchConfig: {
          ...(0, platform_node_js_1.baseFetchConfig)(apiRoot),
          ...options.baseFetchConfig
        },
        canUseWebhookReply: (_e = options.canUseWebhookReply) !== null && _e !== undefined ? _e : () => false,
        sensitiveLogs: (_f = options.sensitiveLogs) !== null && _f !== undefined ? _f : false,
        fetch: (...args) => fetchFn(...args)
      };
      this.fetch = this.options.fetch;
      if (this.options.apiRoot.endsWith("/")) {
        throw new Error(`Remove the trailing '/' from the 'apiRoot' option (use '${this.options.apiRoot.substring(0, this.options.apiRoot.length - 1)}' instead of '${this.options.apiRoot}')`);
      }
    }
    use(...transformers) {
      this.call = transformers.reduce(concatTransformer, this.call);
      this.installedTransformers.push(...transformers);
      return this;
    }
    async callApi(method, payload, signal) {
      const data = await this.call(method, payload, signal);
      if (data.ok)
        return data.result;
      else
        throw (0, error_js_1.toGrammyError)(data, method, payload);
    }
  }
  function createRawApi(token, options, webhookReplyEnvelope) {
    const client = new ApiClient(token, options, webhookReplyEnvelope);
    const proxyHandler = {
      get(_, m) {
        return m === "toJSON" ? "__internal" : m === "getMe" || m === "getWebhookInfo" || m === "getForumTopicIconStickers" || m === "getAvailableGifts" || m === "logOut" || m === "close" || m === "getMyStarBalance" || m === "removeMyProfilePhoto" ? client.callApi.bind(client, m, {}) : client.callApi.bind(client, m);
      },
      ...proxyMethods
    };
    const raw = new Proxy({}, proxyHandler);
    const installedTransformers = client.installedTransformers;
    const api = {
      raw,
      installedTransformers,
      use: (...t) => {
        client.use(...t);
        return api;
      }
    };
    return api;
  }
  var defaultBuildUrl = (root, token, method, env) => {
    const prefix = env === "test" ? "test/" : "";
    return `${root}/bot${token}/${prefix}${method}`;
  };
  var proxyMethods = {
    set() {
      return false;
    },
    defineProperty() {
      return false;
    },
    deleteProperty() {
      return false;
    },
    ownKeys() {
      return [];
    }
  };
  function createTimeout(controller, seconds, method) {
    let handle = undefined;
    const promise = new Promise((_, reject) => {
      handle = setTimeout(() => {
        const msg = `Request to '${method}' timed out after ${seconds} seconds`;
        reject(new Error(msg));
        controller.abort();
      }, 1000 * seconds);
    });
    return { promise, handle };
  }
  function createStreamError(abortController) {
    let onError = (err) => {
      throw err;
    };
    const promise = new Promise((_, reject) => {
      onError = (err) => {
        reject(err);
        abortController.abort();
      };
    });
    return { promise, catch: onError };
  }
  function createAbortControllerFromSignal(signal) {
    const controller = new shim_node_js_1.AbortController;
    if (signal === undefined) {
      return { controller, unregisterSignal: undefined };
    }
    const sig = signal;
    function abort() {
      controller.abort();
      unregisterSignal();
    }
    function unregisterSignal() {
      sig.removeEventListener("abort", abort);
    }
    if (sig.aborted)
      abort();
    else
      sig.addEventListener("abort", abort);
    return {
      controller: { abort, signal: controller.signal },
      unregisterSignal
    };
  }
  function validateSignal(method, payload, signal) {
    if (typeof (signal === null || signal === undefined ? undefined : signal.addEventListener) === "function") {
      return;
    }
    let payload0 = JSON.stringify(payload);
    if (payload0.length > 20) {
      payload0 = payload0.substring(0, 16) + " ...";
    }
    let payload1 = JSON.stringify(signal);
    if (payload1.length > 20) {
      payload1 = payload1.substring(0, 16) + " ...";
    }
    throw new Error(`Incorrect abort signal instance found! You passed two payloads to '${method}' but you should merge the second one containing '${payload1}' into the first one containing '${payload0}'! If you are using context shortcuts, you may want to use a method on 'ctx.api' instead.

If you want to prevent such mistakes in the future, consider using TypeScript. https://www.typescriptlang.org/`);
  }
  var shim_node_js_1 = require_shim_node();
});

// node_modules/grammy/out/core/api.js
var require_api = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.Api = undefined;
  var client_js_1 = require_client();

  class Api {
    constructor(token, options, webhookReplyEnvelope) {
      this.token = token;
      this.options = options;
      const { raw, use, installedTransformers } = (0, client_js_1.createRawApi)(token, options, webhookReplyEnvelope);
      this.raw = raw;
      this.config = {
        use,
        installedTransformers: () => installedTransformers.slice()
      };
    }
    getUpdates(other, signal) {
      return this.raw.getUpdates({ ...other }, signal);
    }
    setWebhook(url, other, signal) {
      return this.raw.setWebhook({ url, ...other }, signal);
    }
    deleteWebhook(other, signal) {
      return this.raw.deleteWebhook({ ...other }, signal);
    }
    getWebhookInfo(signal) {
      return this.raw.getWebhookInfo(signal);
    }
    getMe(signal) {
      return this.raw.getMe(signal);
    }
    logOut(signal) {
      return this.raw.logOut(signal);
    }
    close(signal) {
      return this.raw.close(signal);
    }
    sendMessage(chat_id, text, other, signal) {
      return this.raw.sendMessage({ chat_id, text, ...other }, signal);
    }
    sendRichMessage(chat_id, rich_message, other, signal) {
      return this.raw.sendRichMessage({ chat_id, rich_message, ...other }, signal);
    }
    forwardMessage(chat_id, from_chat_id, message_id, other, signal) {
      return this.raw.forwardMessage({ chat_id, from_chat_id, message_id, ...other }, signal);
    }
    forwardMessages(chat_id, from_chat_id, message_ids, other, signal) {
      return this.raw.forwardMessages({
        chat_id,
        from_chat_id,
        message_ids,
        ...other
      }, signal);
    }
    copyMessage(chat_id, from_chat_id, message_id, other, signal) {
      return this.raw.copyMessage({ chat_id, from_chat_id, message_id, ...other }, signal);
    }
    copyMessages(chat_id, from_chat_id, message_ids, other, signal) {
      return this.raw.copyMessages({
        chat_id,
        from_chat_id,
        message_ids,
        ...other
      }, signal);
    }
    sendPhoto(chat_id, photo, other, signal) {
      return this.raw.sendPhoto({ chat_id, photo, ...other }, signal);
    }
    sendLivePhoto(chat_id, live_photo, photo, other, signal) {
      return this.raw.sendLivePhoto({ chat_id, live_photo, photo, ...other }, signal);
    }
    sendAudio(chat_id, audio, other, signal) {
      return this.raw.sendAudio({ chat_id, audio, ...other }, signal);
    }
    sendDocument(chat_id, document2, other, signal) {
      return this.raw.sendDocument({ chat_id, document: document2, ...other }, signal);
    }
    sendVideo(chat_id, video, other, signal) {
      return this.raw.sendVideo({ chat_id, video, ...other }, signal);
    }
    sendAnimation(chat_id, animation, other, signal) {
      return this.raw.sendAnimation({ chat_id, animation, ...other }, signal);
    }
    sendVoice(chat_id, voice, other, signal) {
      return this.raw.sendVoice({ chat_id, voice, ...other }, signal);
    }
    sendVideoNote(chat_id, video_note, other, signal) {
      return this.raw.sendVideoNote({ chat_id, video_note, ...other }, signal);
    }
    sendPaidMedia(chat_id, star_count, media, other, signal) {
      return this.raw.sendPaidMedia({ chat_id, star_count, media, ...other }, signal);
    }
    sendMediaGroup(chat_id, media, other, signal) {
      return this.raw.sendMediaGroup({ chat_id, media, ...other }, signal);
    }
    sendLocation(chat_id, latitude, longitude, other, signal) {
      return this.raw.sendLocation({ chat_id, latitude, longitude, ...other }, signal);
    }
    editMessageLiveLocation(chat_id, message_id, latitude, longitude, other, signal) {
      return this.raw.editMessageLiveLocation({ chat_id, message_id, latitude, longitude, ...other }, signal);
    }
    editMessageLiveLocationInline(inline_message_id, latitude, longitude, other, signal) {
      return this.raw.editMessageLiveLocation({ inline_message_id, latitude, longitude, ...other }, signal);
    }
    stopMessageLiveLocation(chat_id, message_id, other, signal) {
      return this.raw.stopMessageLiveLocation({ chat_id, message_id, ...other }, signal);
    }
    stopMessageLiveLocationInline(inline_message_id, other, signal) {
      return this.raw.stopMessageLiveLocation({ inline_message_id, ...other }, signal);
    }
    sendVenue(chat_id, latitude, longitude, title, address, other, signal) {
      return this.raw.sendVenue({ chat_id, latitude, longitude, title, address, ...other }, signal);
    }
    sendContact(chat_id, phone_number, first_name, other, signal) {
      return this.raw.sendContact({ chat_id, phone_number, first_name, ...other }, signal);
    }
    sendPoll(chat_id, question, options, other, signal) {
      const opts = options.map((o) => typeof o === "string" ? { text: o } : o);
      return this.raw.sendPoll({ chat_id, question, options: opts, ...other }, signal);
    }
    sendChecklist(business_connection_id, chat_id, checklist, other, signal) {
      return this.raw.sendChecklist({
        business_connection_id,
        chat_id,
        checklist,
        ...other
      }, signal);
    }
    editMessageChecklist(business_connection_id, chat_id, message_id, checklist, other, signal) {
      return this.raw.editMessageChecklist({
        business_connection_id,
        chat_id,
        message_id,
        checklist,
        ...other
      }, signal);
    }
    sendDice(chat_id, emoji, other, signal) {
      return this.raw.sendDice({ chat_id, emoji, ...other }, signal);
    }
    setMessageReaction(chat_id, message_id, reaction, other, signal) {
      return this.raw.setMessageReaction({
        chat_id,
        message_id,
        reaction,
        ...other
      }, signal);
    }
    sendMessageDraft(chat_id, draft_id, text, other, signal) {
      return this.raw.sendMessageDraft({ chat_id, draft_id, text, ...other }, signal);
    }
    sendRichMessageDraft(chat_id, draft_id, rich_message, other, signal) {
      return this.raw.sendRichMessageDraft({ chat_id, draft_id, rich_message, ...other }, signal);
    }
    sendChatAction(chat_id, action, other, signal) {
      return this.raw.sendChatAction({ chat_id, action, ...other }, signal);
    }
    getUserProfilePhotos(user_id, other, signal) {
      return this.raw.getUserProfilePhotos({ user_id, ...other }, signal);
    }
    getUserProfileAudios(user_id, other, signal) {
      return this.raw.getUserProfileAudios({ user_id, ...other }, signal);
    }
    setUserEmojiStatus(user_id, other, signal) {
      return this.raw.setUserEmojiStatus({ user_id, ...other }, signal);
    }
    getUserChatBoosts(chat_id, user_id, signal) {
      return this.raw.getUserChatBoosts({ chat_id, user_id }, signal);
    }
    getUserGifts(user_id, other, signal) {
      return this.raw.getUserGifts({ user_id, ...other }, signal);
    }
    getChatGifts(chat_id, other, signal) {
      return this.raw.getChatGifts({ chat_id, ...other }, signal);
    }
    getBusinessConnection(business_connection_id, signal) {
      return this.raw.getBusinessConnection({ business_connection_id }, signal);
    }
    getManagedBotToken(user_id, signal) {
      return this.raw.getManagedBotToken({ user_id }, signal);
    }
    replaceManagedBotToken(user_id, signal) {
      return this.raw.replaceManagedBotToken({ user_id }, signal);
    }
    getManagedBotAccessSettings(user_id, signal) {
      return this.raw.getManagedBotAccessSettings({ user_id }, signal);
    }
    setManagedBotAccessSettings(user_id, is_access_restricted, other, signal) {
      return this.raw.setManagedBotAccessSettings({
        user_id,
        is_access_restricted,
        ...other
      }, signal);
    }
    getFile(file_id, signal) {
      return this.raw.getFile({ file_id }, signal);
    }
    kickChatMember(...args) {
      return this.banChatMember(...args);
    }
    banChatMember(chat_id, user_id, other, signal) {
      return this.raw.banChatMember({ chat_id, user_id, ...other }, signal);
    }
    unbanChatMember(chat_id, user_id, other, signal) {
      return this.raw.unbanChatMember({ chat_id, user_id, ...other }, signal);
    }
    restrictChatMember(chat_id, user_id, permissions, other, signal) {
      return this.raw.restrictChatMember({ chat_id, user_id, permissions, ...other }, signal);
    }
    promoteChatMember(chat_id, user_id, other, signal) {
      return this.raw.promoteChatMember({ chat_id, user_id, ...other }, signal);
    }
    setChatAdministratorCustomTitle(chat_id, user_id, custom_title, signal) {
      return this.raw.setChatAdministratorCustomTitle({ chat_id, user_id, custom_title }, signal);
    }
    setChatMemberTag(chat_id, user_id, tag, signal) {
      return this.raw.setChatMemberTag({ chat_id, user_id, tag }, signal);
    }
    banChatSenderChat(chat_id, sender_chat_id, signal) {
      return this.raw.banChatSenderChat({ chat_id, sender_chat_id }, signal);
    }
    unbanChatSenderChat(chat_id, sender_chat_id, signal) {
      return this.raw.unbanChatSenderChat({ chat_id, sender_chat_id }, signal);
    }
    setChatPermissions(chat_id, permissions, other, signal) {
      return this.raw.setChatPermissions({ chat_id, permissions, ...other }, signal);
    }
    exportChatInviteLink(chat_id, signal) {
      return this.raw.exportChatInviteLink({ chat_id }, signal);
    }
    createChatInviteLink(chat_id, other, signal) {
      return this.raw.createChatInviteLink({ chat_id, ...other }, signal);
    }
    editChatInviteLink(chat_id, invite_link, other, signal) {
      return this.raw.editChatInviteLink({ chat_id, invite_link, ...other }, signal);
    }
    createChatSubscriptionInviteLink(chat_id, subscription_period, subscription_price, other, signal) {
      return this.raw.createChatSubscriptionInviteLink({ chat_id, subscription_period, subscription_price, ...other }, signal);
    }
    editChatSubscriptionInviteLink(chat_id, invite_link, other, signal) {
      return this.raw.editChatSubscriptionInviteLink({ chat_id, invite_link, ...other }, signal);
    }
    revokeChatInviteLink(chat_id, invite_link, signal) {
      return this.raw.revokeChatInviteLink({ chat_id, invite_link }, signal);
    }
    approveChatJoinRequest(chat_id, user_id, signal) {
      return this.raw.approveChatJoinRequest({ chat_id, user_id }, signal);
    }
    declineChatJoinRequest(chat_id, user_id, signal) {
      return this.raw.declineChatJoinRequest({ chat_id, user_id }, signal);
    }
    answerChatJoinRequestQuery(chat_join_request_query_id, result, signal) {
      return this.raw.answerChatJoinRequestQuery({ chat_join_request_query_id, result }, signal);
    }
    sendChatJoinRequestWebApp(chat_join_request_query_id, web_app_url, signal) {
      return this.raw.sendChatJoinRequestWebApp({ chat_join_request_query_id, web_app_url }, signal);
    }
    approveSuggestedPost(chat_id, message_id, other, signal) {
      return this.raw.approveSuggestedPost({ chat_id, message_id, ...other }, signal);
    }
    declineSuggestedPost(chat_id, message_id, other, signal) {
      return this.raw.declineSuggestedPost({ chat_id, message_id, ...other }, signal);
    }
    setChatPhoto(chat_id, photo, signal) {
      return this.raw.setChatPhoto({ chat_id, photo }, signal);
    }
    deleteChatPhoto(chat_id, signal) {
      return this.raw.deleteChatPhoto({ chat_id }, signal);
    }
    setChatTitle(chat_id, title, signal) {
      return this.raw.setChatTitle({ chat_id, title }, signal);
    }
    setChatDescription(chat_id, description, signal) {
      return this.raw.setChatDescription({ chat_id, description }, signal);
    }
    pinChatMessage(chat_id, message_id, other, signal) {
      return this.raw.pinChatMessage({ chat_id, message_id, ...other }, signal);
    }
    unpinChatMessage(chat_id, message_id, other, signal) {
      return this.raw.unpinChatMessage({ chat_id, message_id, ...other }, signal);
    }
    unpinAllChatMessages(chat_id, signal) {
      return this.raw.unpinAllChatMessages({ chat_id }, signal);
    }
    leaveChat(chat_id, signal) {
      return this.raw.leaveChat({ chat_id }, signal);
    }
    getChat(chat_id, signal) {
      return this.raw.getChat({ chat_id }, signal);
    }
    getChatAdministrators(chat_id, other, signal) {
      return this.raw.getChatAdministrators({ chat_id, ...other }, signal);
    }
    getChatMembersCount(...args) {
      return this.getChatMemberCount(...args);
    }
    getChatMemberCount(chat_id, signal) {
      return this.raw.getChatMemberCount({ chat_id }, signal);
    }
    getChatMember(chat_id, user_id, signal) {
      return this.raw.getChatMember({ chat_id, user_id }, signal);
    }
    getUserPersonalChatMessages(user_id, limit, signal) {
      return this.raw.getUserPersonalChatMessages({ user_id, limit }, signal);
    }
    setChatStickerSet(chat_id, sticker_set_name, signal) {
      return this.raw.setChatStickerSet({ chat_id, sticker_set_name }, signal);
    }
    deleteChatStickerSet(chat_id, signal) {
      return this.raw.deleteChatStickerSet({ chat_id }, signal);
    }
    getForumTopicIconStickers(signal) {
      return this.raw.getForumTopicIconStickers(signal);
    }
    createForumTopic(chat_id, name, other, signal) {
      return this.raw.createForumTopic({ chat_id, name, ...other }, signal);
    }
    editForumTopic(chat_id, message_thread_id, other, signal) {
      return this.raw.editForumTopic({ chat_id, message_thread_id, ...other }, signal);
    }
    closeForumTopic(chat_id, message_thread_id, signal) {
      return this.raw.closeForumTopic({ chat_id, message_thread_id }, signal);
    }
    reopenForumTopic(chat_id, message_thread_id, signal) {
      return this.raw.reopenForumTopic({ chat_id, message_thread_id }, signal);
    }
    deleteForumTopic(chat_id, message_thread_id, signal) {
      return this.raw.deleteForumTopic({ chat_id, message_thread_id }, signal);
    }
    unpinAllForumTopicMessages(chat_id, message_thread_id, signal) {
      return this.raw.unpinAllForumTopicMessages({ chat_id, message_thread_id }, signal);
    }
    editGeneralForumTopic(chat_id, name, signal) {
      return this.raw.editGeneralForumTopic({ chat_id, name }, signal);
    }
    closeGeneralForumTopic(chat_id, signal) {
      return this.raw.closeGeneralForumTopic({ chat_id }, signal);
    }
    reopenGeneralForumTopic(chat_id, signal) {
      return this.raw.reopenGeneralForumTopic({ chat_id }, signal);
    }
    hideGeneralForumTopic(chat_id, signal) {
      return this.raw.hideGeneralForumTopic({ chat_id }, signal);
    }
    unhideGeneralForumTopic(chat_id, signal) {
      return this.raw.unhideGeneralForumTopic({ chat_id }, signal);
    }
    unpinAllGeneralForumTopicMessages(chat_id, signal) {
      return this.raw.unpinAllGeneralForumTopicMessages({ chat_id }, signal);
    }
    answerCallbackQuery(callback_query_id, other, signal) {
      return this.raw.answerCallbackQuery({ callback_query_id, ...other }, signal);
    }
    answerGuestQuery(guest_query_id, result, signal) {
      return this.raw.answerGuestQuery({ guest_query_id, result }, signal);
    }
    setMyName(name, other, signal) {
      return this.raw.setMyName({ name, ...other }, signal);
    }
    getMyName(other, signal) {
      return this.raw.getMyName(other !== null && other !== undefined ? other : {}, signal);
    }
    setMyCommands(commands, other, signal) {
      return this.raw.setMyCommands({ commands, ...other }, signal);
    }
    deleteMyCommands(other, signal) {
      return this.raw.deleteMyCommands({ ...other }, signal);
    }
    getMyCommands(other, signal) {
      return this.raw.getMyCommands({ ...other }, signal);
    }
    setMyDescription(description, other, signal) {
      return this.raw.setMyDescription({ description, ...other }, signal);
    }
    getMyDescription(other, signal) {
      return this.raw.getMyDescription({ ...other }, signal);
    }
    setMyShortDescription(short_description, other, signal) {
      return this.raw.setMyShortDescription({ short_description, ...other }, signal);
    }
    getMyShortDescription(other, signal) {
      return this.raw.getMyShortDescription({ ...other }, signal);
    }
    setMyProfilePhoto(photo, signal) {
      return this.raw.setMyProfilePhoto({ photo }, signal);
    }
    removeMyProfilePhoto(signal) {
      return this.raw.removeMyProfilePhoto(signal);
    }
    setChatMenuButton(other, signal) {
      return this.raw.setChatMenuButton({ ...other }, signal);
    }
    getChatMenuButton(other, signal) {
      return this.raw.getChatMenuButton({ ...other }, signal);
    }
    setMyDefaultAdministratorRights(other, signal) {
      return this.raw.setMyDefaultAdministratorRights({ ...other }, signal);
    }
    getMyDefaultAdministratorRights(other, signal) {
      return this.raw.getMyDefaultAdministratorRights({ ...other }, signal);
    }
    getMyStarBalance(signal) {
      return this.raw.getMyStarBalance(signal);
    }
    editMessageText(chat_id, message_id, text_or_rich_message, other, signal) {
      return this.raw.editMessageText(typeof text_or_rich_message === "string" ? { chat_id, message_id, text: text_or_rich_message, ...other } : {
        chat_id,
        message_id,
        rich_message: text_or_rich_message,
        ...other
      }, signal);
    }
    editMessageTextInline(inline_message_id, text_or_rich_message, other, signal) {
      return this.raw.editMessageText(typeof text_or_rich_message === "string" ? { inline_message_id, text: text_or_rich_message, ...other } : {
        inline_message_id,
        rich_message: text_or_rich_message,
        ...other
      }, signal);
    }
    editMessageCaption(chat_id, message_id, other, signal) {
      return this.raw.editMessageCaption({ chat_id, message_id, ...other }, signal);
    }
    editMessageCaptionInline(inline_message_id, other, signal) {
      return this.raw.editMessageCaption({ inline_message_id, ...other }, signal);
    }
    editMessageMedia(chat_id, message_id, media, other, signal) {
      return this.raw.editMessageMedia({ chat_id, message_id, media, ...other }, signal);
    }
    editMessageMediaInline(inline_message_id, media, other, signal) {
      return this.raw.editMessageMedia({ inline_message_id, media, ...other }, signal);
    }
    editMessageReplyMarkup(chat_id, message_id, other, signal) {
      return this.raw.editMessageReplyMarkup({ chat_id, message_id, ...other }, signal);
    }
    editMessageReplyMarkupInline(inline_message_id, other, signal) {
      return this.raw.editMessageReplyMarkup({ inline_message_id, ...other }, signal);
    }
    stopPoll(chat_id, message_id, other, signal) {
      return this.raw.stopPoll({ chat_id, message_id, ...other }, signal);
    }
    editEphemeralMessageText(chat_id, receiver_user_id, ephemeral_message_id, text_or_rich_message, other, signal) {
      return this.raw.editEphemeralMessageText(typeof text_or_rich_message === "string" ? {
        chat_id,
        receiver_user_id,
        ephemeral_message_id,
        text: text_or_rich_message,
        ...other
      } : {
        chat_id,
        receiver_user_id,
        ephemeral_message_id,
        rich_message: text_or_rich_message,
        ...other
      }, signal);
    }
    editEphemeralMessageMedia(chat_id, receiver_user_id, ephemeral_message_id, media, other, signal) {
      return this.raw.editEphemeralMessageMedia({
        chat_id,
        receiver_user_id,
        ephemeral_message_id,
        media,
        ...other
      }, signal);
    }
    editEphemeralMessageCaption(chat_id, receiver_user_id, ephemeral_message_id, caption, other, signal) {
      return this.raw.editEphemeralMessageCaption({
        chat_id,
        receiver_user_id,
        ephemeral_message_id,
        caption,
        ...other
      }, signal);
    }
    editEphemeralMessageReplyMarkup(chat_id, receiver_user_id, ephemeral_message_id, other, signal) {
      return this.raw.editEphemeralMessageReplyMarkup({ chat_id, receiver_user_id, ephemeral_message_id, ...other }, signal);
    }
    deleteMessage(chat_id, message_id, signal) {
      return this.raw.deleteMessage({ chat_id, message_id }, signal);
    }
    deleteMessages(chat_id, message_ids, signal) {
      return this.raw.deleteMessages({ chat_id, message_ids }, signal);
    }
    deleteEphemeralMessage(chat_id, receiver_user_id, ephemeral_message_id, signal) {
      return this.raw.deleteEphemeralMessage({ chat_id, receiver_user_id, ephemeral_message_id }, signal);
    }
    deleteMessageReactionUser(chat_id, message_id, user_id, other, signal) {
      return this.raw.deleteMessageReaction({
        chat_id,
        message_id,
        user_id,
        ...other
      }, signal);
    }
    deleteMessageReactionChat(chat_id, message_id, actor_chat_id, other, signal) {
      return this.raw.deleteMessageReaction({
        chat_id,
        message_id,
        actor_chat_id,
        ...other
      }, signal);
    }
    deleteAllMessageReactionsUser(chat_id, user_id, other, signal) {
      return this.raw.deleteAllMessageReactions({
        chat_id,
        user_id,
        ...other
      }, signal);
    }
    deleteAllMessageReactionsChat(chat_id, actor_chat_id, other, signal) {
      return this.raw.deleteAllMessageReactions({
        chat_id,
        actor_chat_id,
        ...other
      }, signal);
    }
    deleteBusinessMessages(business_connection_id, message_ids, signal) {
      return this.raw.deleteBusinessMessages({ business_connection_id, message_ids }, signal);
    }
    setBusinessAccountName(business_connection_id, first_name, other, signal) {
      return this.raw.setBusinessAccountName({ business_connection_id, first_name, ...other }, signal);
    }
    setBusinessAccountUsername(business_connection_id, username, signal) {
      return this.raw.setBusinessAccountUsername({ business_connection_id, username }, signal);
    }
    setBusinessAccountBio(business_connection_id, bio, signal) {
      return this.raw.setBusinessAccountBio({ business_connection_id, bio }, signal);
    }
    setBusinessAccountProfilePhoto(business_connection_id, photo, other, signal) {
      return this.raw.setBusinessAccountProfilePhoto({ business_connection_id, photo, ...other }, signal);
    }
    removeBusinessAccountProfilePhoto(business_connection_id, other, signal) {
      return this.raw.removeBusinessAccountProfilePhoto({ business_connection_id, ...other }, signal);
    }
    setBusinessAccountGiftSettings(business_connection_id, show_gift_button, accepted_gift_types, signal) {
      return this.raw.setBusinessAccountGiftSettings({ business_connection_id, show_gift_button, accepted_gift_types }, signal);
    }
    getBusinessAccountStarBalance(business_connection_id, signal) {
      return this.raw.getBusinessAccountStarBalance({ business_connection_id }, signal);
    }
    transferBusinessAccountStars(business_connection_id, star_count, signal) {
      return this.raw.transferBusinessAccountStars({ business_connection_id, star_count }, signal);
    }
    getBusinessAccountGifts(business_connection_id, other, signal) {
      return this.raw.getBusinessAccountGifts({ business_connection_id, ...other }, signal);
    }
    convertGiftToStars(business_connection_id, owned_gift_id, signal) {
      return this.raw.convertGiftToStars({ business_connection_id, owned_gift_id }, signal);
    }
    upgradeGift(business_connection_id, owned_gift_id, other, signal) {
      return this.raw.upgradeGift({ business_connection_id, owned_gift_id, ...other }, signal);
    }
    transferGift(business_connection_id, owned_gift_id, new_owner_chat_id, star_count, signal) {
      return this.raw.transferGift({
        business_connection_id,
        owned_gift_id,
        new_owner_chat_id,
        star_count
      }, signal);
    }
    postStory(business_connection_id, content, active_period, other, signal) {
      return this.raw.postStory({ business_connection_id, content, active_period, ...other }, signal);
    }
    repostStory(business_connection_id, from_chat_id, from_story_id, active_period, other, signal) {
      return this.raw.repostStory({
        business_connection_id,
        from_chat_id,
        from_story_id,
        active_period,
        ...other
      }, signal);
    }
    editStory(business_connection_id, story_id, content, other, signal) {
      return this.raw.editStory({ business_connection_id, story_id, content, ...other }, signal);
    }
    deleteStory(business_connection_id, story_id, signal) {
      return this.raw.deleteStory({ business_connection_id, story_id }, signal);
    }
    sendSticker(chat_id, sticker, other, signal) {
      return this.raw.sendSticker({ chat_id, sticker, ...other }, signal);
    }
    getStickerSet(name, signal) {
      return this.raw.getStickerSet({ name }, signal);
    }
    getCustomEmojiStickers(custom_emoji_ids, signal) {
      return this.raw.getCustomEmojiStickers({ custom_emoji_ids }, signal);
    }
    uploadStickerFile(user_id, sticker_format, sticker, signal) {
      return this.raw.uploadStickerFile({ user_id, sticker_format, sticker }, signal);
    }
    createNewStickerSet(user_id, name, title, stickers, other, signal) {
      return this.raw.createNewStickerSet({ user_id, name, title, stickers, ...other }, signal);
    }
    addStickerToSet(user_id, name, sticker, signal) {
      return this.raw.addStickerToSet({ user_id, name, sticker }, signal);
    }
    setStickerPositionInSet(sticker, position, signal) {
      return this.raw.setStickerPositionInSet({ sticker, position }, signal);
    }
    deleteStickerFromSet(sticker, signal) {
      return this.raw.deleteStickerFromSet({ sticker }, signal);
    }
    replaceStickerInSet(user_id, name, old_sticker, sticker, signal) {
      return this.raw.replaceStickerInSet({ user_id, name, old_sticker, sticker }, signal);
    }
    setStickerEmojiList(sticker, emoji_list, signal) {
      return this.raw.setStickerEmojiList({ sticker, emoji_list }, signal);
    }
    setStickerKeywords(sticker, keywords, signal) {
      return this.raw.setStickerKeywords({ sticker, keywords }, signal);
    }
    setStickerMaskPosition(sticker, mask_position, signal) {
      return this.raw.setStickerMaskPosition({ sticker, mask_position }, signal);
    }
    setStickerSetTitle(name, title, signal) {
      return this.raw.setStickerSetTitle({ name, title }, signal);
    }
    deleteStickerSet(name, signal) {
      return this.raw.deleteStickerSet({ name }, signal);
    }
    setStickerSetThumbnail(name, user_id, thumbnail, format, signal) {
      return this.raw.setStickerSetThumbnail({ name, user_id, thumbnail, format }, signal);
    }
    setCustomEmojiStickerSetThumbnail(name, custom_emoji_id, signal) {
      return this.raw.setCustomEmojiStickerSetThumbnail({
        name,
        custom_emoji_id
      }, signal);
    }
    getAvailableGifts(signal) {
      return this.raw.getAvailableGifts(signal);
    }
    sendGift(user_id, gift_id, other, signal) {
      return this.raw.sendGift({ user_id, gift_id, ...other }, signal);
    }
    giftPremiumSubscription(user_id, month_count, star_count, other, signal) {
      return this.raw.giftPremiumSubscription({ user_id, month_count, star_count, ...other }, signal);
    }
    sendGiftToChannel(chat_id, gift_id, other, signal) {
      return this.raw.sendGift({ chat_id, gift_id, ...other }, signal);
    }
    answerInlineQuery(inline_query_id, results, other, signal) {
      return this.raw.answerInlineQuery({ inline_query_id, results, ...other }, signal);
    }
    answerWebAppQuery(web_app_query_id, result, signal) {
      return this.raw.answerWebAppQuery({ web_app_query_id, result }, signal);
    }
    savePreparedInlineMessage(user_id, result, other, signal) {
      return this.raw.savePreparedInlineMessage({ user_id, result, ...other }, signal);
    }
    savePreparedKeyboardButton(user_id, button, signal) {
      return this.raw.savePreparedKeyboardButton({ user_id, button }, signal);
    }
    sendInvoice(chat_id, title, description, payload, currency, prices, other, signal) {
      return this.raw.sendInvoice({
        chat_id,
        title,
        description,
        payload,
        currency,
        prices,
        ...other
      }, signal);
    }
    createInvoiceLink(title, description, payload, provider_token, currency, prices, other, signal) {
      return this.raw.createInvoiceLink({
        title,
        description,
        payload,
        provider_token,
        currency,
        prices,
        ...other
      }, signal);
    }
    answerShippingQuery(shipping_query_id, ok, other, signal) {
      return this.raw.answerShippingQuery({ shipping_query_id, ok, ...other }, signal);
    }
    answerPreCheckoutQuery(pre_checkout_query_id, ok, other, signal) {
      return this.raw.answerPreCheckoutQuery({ pre_checkout_query_id, ok, ...other }, signal);
    }
    getStarTransactions(other, signal) {
      return this.raw.getStarTransactions({ ...other }, signal);
    }
    refundStarPayment(user_id, telegram_payment_charge_id, signal) {
      return this.raw.refundStarPayment({ user_id, telegram_payment_charge_id }, signal);
    }
    editUserStarSubscription(user_id, telegram_payment_charge_id, is_canceled, signal) {
      return this.raw.editUserStarSubscription({ user_id, telegram_payment_charge_id, is_canceled }, signal);
    }
    verifyUser(user_id, other, signal) {
      return this.raw.verifyUser({ user_id, ...other }, signal);
    }
    verifyChat(chat_id, other, signal) {
      return this.raw.verifyChat({ chat_id, ...other }, signal);
    }
    removeUserVerification(user_id, signal) {
      return this.raw.removeUserVerification({ user_id }, signal);
    }
    removeChatVerification(chat_id, signal) {
      return this.raw.removeChatVerification({ chat_id }, signal);
    }
    readBusinessMessage(business_connection_id, chat_id, message_id, signal) {
      return this.raw.readBusinessMessage({ business_connection_id, chat_id, message_id }, signal);
    }
    setPassportDataErrors(user_id, errors, signal) {
      return this.raw.setPassportDataErrors({ user_id, errors }, signal);
    }
    sendGame(chat_id, game_short_name, other, signal) {
      return this.raw.sendGame({ chat_id, game_short_name, ...other }, signal);
    }
    setGameScore(chat_id, message_id, user_id, score, other, signal) {
      return this.raw.setGameScore({ chat_id, message_id, user_id, score, ...other }, signal);
    }
    setGameScoreInline(inline_message_id, user_id, score, other, signal) {
      return this.raw.setGameScore({ inline_message_id, user_id, score, ...other }, signal);
    }
    getGameHighScores(chat_id, message_id, user_id, signal) {
      return this.raw.getGameHighScores({ chat_id, message_id, user_id }, signal);
    }
    getGameHighScoresInline(inline_message_id, user_id, signal) {
      return this.raw.getGameHighScores({ inline_message_id, user_id }, signal);
    }
  }
  exports.Api = Api;
});

// node_modules/grammy/out/bot.js
var require_bot = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.Bot = exports.BotError = exports.DEFAULT_UPDATE_TYPES = undefined;
  var composer_js_1 = require_composer();
  Object.defineProperty(exports, "BotError", { enumerable: true, get: function() {
    return composer_js_1.BotError;
  } });
  var context_js_1 = require_context();
  var api_js_1 = require_api();
  var error_js_1 = require_error();
  var filter_js_1 = require_filter();
  var platform_node_js_1 = require_platform_node();
  var debug = (0, platform_node_js_1.debug)("grammy:bot");
  var debugWarn = (0, platform_node_js_1.debug)("grammy:warn");
  var debugErr = (0, platform_node_js_1.debug)("grammy:error");
  exports.DEFAULT_UPDATE_TYPES = [
    "message",
    "edited_message",
    "channel_post",
    "edited_channel_post",
    "business_connection",
    "business_message",
    "edited_business_message",
    "deleted_business_messages",
    "guest_message",
    "stopped_message_generation",
    "inline_query",
    "chosen_inline_result",
    "callback_query",
    "shipping_query",
    "pre_checkout_query",
    "purchased_paid_media",
    "poll",
    "poll_answer",
    "my_chat_member",
    "managed_bot",
    "chat_join_request",
    "chat_boost",
    "removed_chat_boost",
    "subscription"
  ];

  class Bot extends composer_js_1.Composer {
    constructor(token, config) {
      var _a;
      super();
      this.token = token;
      this.pollingRunning = false;
      this.lastTriedUpdateId = 0;
      this.observedUpdateTypes = new Set;
      this.errorHandler = async (err) => {
        var _a2, _b;
        console.error("Error in middleware while handling update", (_b = (_a2 = err.ctx) === null || _a2 === undefined ? undefined : _a2.update) === null || _b === undefined ? undefined : _b.update_id, err.error);
        console.error("No error handler was set!");
        console.error("Set your own error handler with `bot.catch = ...`");
        if (this.pollingRunning) {
          console.error("Stopping bot");
          await this.stop();
        }
        throw err;
      };
      if (!token)
        throw new Error("Empty token!");
      this.me = config === null || config === undefined ? undefined : config.botInfo;
      this.clientConfig = config === null || config === undefined ? undefined : config.client;
      this.ContextConstructor = (_a = config === null || config === undefined ? undefined : config.ContextConstructor) !== null && _a !== undefined ? _a : context_js_1.Context;
      this.api = new api_js_1.Api(token, this.clientConfig);
    }
    set botInfo(botInfo) {
      this.me = botInfo;
    }
    get botInfo() {
      if (this.me === undefined) {
        throw new Error("Bot information unavailable! Make sure to call `await bot.init()` before accessing `bot.botInfo`!");
      }
      return this.me;
    }
    on(filter, ...middleware) {
      for (const [u] of (0, filter_js_1.parse)(filter).flatMap(filter_js_1.preprocess)) {
        this.observedUpdateTypes.add(u);
      }
      return super.on(filter, ...middleware);
    }
    reaction(reaction, ...middleware) {
      this.observedUpdateTypes.add("message_reaction");
      return super.reaction(reaction, ...middleware);
    }
    isInited() {
      return this.me !== undefined;
    }
    async init(signal) {
      var _a;
      if (!this.isInited()) {
        debug("Initializing bot");
        (_a = this.mePromise) !== null && _a !== undefined || (this.mePromise = withRetries(() => this.api.getMe(signal), signal));
        let me;
        try {
          me = await this.mePromise;
        } finally {
          this.mePromise = undefined;
        }
        if (this.me === undefined)
          this.me = me;
        else
          debug("Bot info was set by now, will not overwrite");
      }
      debug(`I am ${this.me.username}!`);
    }
    async handleUpdates(updates) {
      for (const update of updates) {
        this.lastTriedUpdateId = update.update_id;
        try {
          await this.handleUpdate(update);
        } catch (err) {
          if (err instanceof composer_js_1.BotError) {
            await this.errorHandler(err);
          } else {
            console.error("FATAL: grammY unable to handle:", err);
            throw err;
          }
        }
      }
    }
    async handleUpdate(update, webhookReplyEnvelope) {
      if (this.me === undefined) {
        throw new Error("Bot not initialized! Either call `await bot.init()`, or directly set the `botInfo` option in the `Bot` constructor to specify a known bot info object.");
      }
      debug(`Processing update ${update.update_id}`);
      const api = new api_js_1.Api(this.token, this.clientConfig, webhookReplyEnvelope);
      const t = this.api.config.installedTransformers();
      if (t.length > 0)
        api.config.use(...t);
      const ctx = new this.ContextConstructor(update, api, this.me);
      try {
        await (0, composer_js_1.run)(this.middleware(), ctx);
      } catch (err) {
        debugErr(`Error in middleware for update ${update.update_id}`);
        throw new composer_js_1.BotError(err, ctx);
      }
    }
    async start(options) {
      var _a, _b, _c;
      const setup = [];
      if (!this.isInited()) {
        setup.push(this.init((_a = this.pollingAbortController) === null || _a === undefined ? undefined : _a.signal));
      }
      if (this.pollingRunning) {
        await Promise.all(setup);
        debug("Simple long polling already running!");
        return;
      }
      this.pollingRunning = true;
      this.pollingAbortController = new shim_node_js_1.AbortController;
      setup.push(withRetries(async () => {
        var _a2;
        await this.api.deleteWebhook({
          drop_pending_updates: options === null || options === undefined ? undefined : options.drop_pending_updates
        }, (_a2 = this.pollingAbortController) === null || _a2 === undefined ? undefined : _a2.signal);
      }, (_b = this.pollingAbortController) === null || _b === undefined ? undefined : _b.signal));
      try {
        await Promise.all(setup);
        await ((_c = options === null || options === undefined ? undefined : options.onStart) === null || _c === undefined ? undefined : _c.call(options, this.botInfo));
      } catch (err) {
        this.pollingRunning = false;
        this.pollingAbortController = undefined;
        throw err;
      }
      if (!this.pollingRunning)
        return;
      validateAllowedUpdates(this.observedUpdateTypes, options === null || options === undefined ? undefined : options.allowed_updates);
      this.use = noUseFunction;
      debug("Starting simple long polling");
      await this.loop(options);
      debug("Middleware is done running");
    }
    async stop() {
      var _a;
      if (this.pollingRunning) {
        debug("Stopping bot, saving update offset");
        this.pollingRunning = false;
        (_a = this.pollingAbortController) === null || _a === undefined || _a.abort();
        const offset = this.lastTriedUpdateId + 1;
        await this.api.getUpdates({ offset, limit: 1 }).finally(() => this.pollingAbortController = undefined);
      } else {
        debug("Bot is not running!");
      }
    }
    isRunning() {
      return this.pollingRunning;
    }
    catch(errorHandler) {
      this.errorHandler = errorHandler;
    }
    async loop(options) {
      var _a, _b;
      const limit = options === null || options === undefined ? undefined : options.limit;
      const timeout = (_a = options === null || options === undefined ? undefined : options.timeout) !== null && _a !== undefined ? _a : 30;
      let allowed_updates = (_b = options === null || options === undefined ? undefined : options.allowed_updates) !== null && _b !== undefined ? _b : [];
      try {
        while (this.pollingRunning) {
          const updates = await this.fetchUpdates({ limit, timeout, allowed_updates });
          if (updates === undefined)
            break;
          await this.handleUpdates(updates);
          allowed_updates = undefined;
        }
      } finally {
        this.pollingRunning = false;
      }
    }
    async fetchUpdates({ limit, timeout, allowed_updates }) {
      var _a;
      const offset = this.lastTriedUpdateId + 1;
      let updates = undefined;
      do {
        try {
          updates = await this.api.getUpdates({ offset, limit, timeout, allowed_updates }, (_a = this.pollingAbortController) === null || _a === undefined ? undefined : _a.signal);
        } catch (error) {
          await this.handlePollingError(error);
        }
      } while (updates === undefined && this.pollingRunning);
      return updates;
    }
    async handlePollingError(error) {
      var _a;
      if (!this.pollingRunning) {
        debug("Pending getUpdates request cancelled");
        return;
      }
      let sleepSeconds = 3;
      if (error instanceof error_js_1.GrammyError) {
        debugErr(error.message);
        if (error.error_code === 401 || error.error_code === 409) {
          throw error;
        } else if (error.error_code === 429) {
          debugErr("Bot API server is closing.");
          sleepSeconds = (_a = error.parameters.retry_after) !== null && _a !== undefined ? _a : sleepSeconds;
        }
      } else
        debugErr(error);
      debugErr(`Call to getUpdates failed, retrying in ${sleepSeconds} seconds ...`);
      await sleep(1000 * sleepSeconds);
    }
  }
  exports.Bot = Bot;
  async function withRetries(task, signal) {
    const INITIAL_DELAY = 50;
    let lastDelay = INITIAL_DELAY;
    async function handleError(error) {
      let delay = false;
      let strategy = "rethrow";
      if (error instanceof error_js_1.HttpError) {
        delay = true;
        strategy = "retry";
      } else if (error instanceof error_js_1.GrammyError) {
        if (error.error_code >= 500) {
          delay = true;
          strategy = "retry";
        } else if (error.error_code === 429) {
          const retryAfterSeconds = error.parameters.retry_after;
          if (typeof retryAfterSeconds === "number") {
            await sleep(1000 * retryAfterSeconds, signal);
            lastDelay = INITIAL_DELAY;
          } else {
            delay = true;
          }
          strategy = "retry";
        }
      }
      if (delay) {
        if (lastDelay !== INITIAL_DELAY) {
          await sleep(lastDelay, signal);
        }
        const TWENTY_MINUTES = 20 * 60 * 1000;
        lastDelay = Math.min(TWENTY_MINUTES, 2 * lastDelay);
      }
      return strategy;
    }
    let result = { ok: false };
    while (!result.ok) {
      try {
        result = { ok: true, value: await task() };
      } catch (error) {
        debugErr(error);
        const strategy = await handleError(error);
        switch (strategy) {
          case "retry":
            continue;
          case "rethrow":
            throw error;
        }
      }
    }
    return result.value;
  }
  async function sleep(milliseconds, signal) {
    let handle;
    let reject;
    function abort() {
      reject === null || reject === undefined || reject(new Error("Aborted delay"));
      if (handle !== undefined)
        clearTimeout(handle);
    }
    try {
      await new Promise((res, rej) => {
        reject = rej;
        if (signal === null || signal === undefined ? undefined : signal.aborted) {
          abort();
          return;
        }
        signal === null || signal === undefined || signal.addEventListener("abort", abort);
        handle = setTimeout(res, milliseconds);
      });
    } finally {
      signal === null || signal === undefined || signal.removeEventListener("abort", abort);
    }
  }
  function validateAllowedUpdates(updates, allowed = exports.DEFAULT_UPDATE_TYPES) {
    const impossible = Array.from(updates).filter((u) => !allowed.includes(u));
    if (impossible.length > 0) {
      debugWarn(`You registered listeners for the following update types, but you did not specify them in \`allowed_updates\` so they may not be received: ${impossible.map((u) => `'${u}'`).join(", ")}`);
    }
  }
  function noUseFunction() {
    throw new Error(`It looks like you are registering more listeners on your bot from within other listeners! This means that every time your bot handles a message like this one, new listeners will be added. This list grows until your machine crashes, so grammY throws this error to tell you that you should probably do things a bit differently. If you're unsure how to resolve this problem, you can ask in the group chat: https://telegram.me/grammyjs

On the other hand, if you actually know what you're doing and you do need to install further middleware while your bot is running, consider installing a composer instance on your bot, and in turn augment the composer after the fact. This way, you can circumvent this protection against memory leaks.`);
  }
  var shim_node_js_1 = require_shim_node();
});

// node_modules/grammy/out/convenience/constants.js
var require_constants = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.API_CONSTANTS = undefined;
  var bot_js_1 = require_bot();
  var ALL_UPDATE_TYPES = [
    ...bot_js_1.DEFAULT_UPDATE_TYPES,
    "chat_member",
    "message_reaction",
    "message_reaction_count"
  ];
  var ALL_CHAT_PERMISSIONS = {
    can_send_messages: true,
    can_send_audios: true,
    can_send_documents: true,
    can_send_photos: true,
    can_send_videos: true,
    can_send_video_notes: true,
    can_send_voice_notes: true,
    can_send_polls: true,
    can_send_other_messages: true,
    can_add_web_page_previews: true,
    can_react_to_messages: true,
    can_change_info: true,
    can_invite_users: true,
    can_edit_tag: true,
    can_pin_messages: true,
    can_manage_topics: true
  };
  exports.API_CONSTANTS = {
    DEFAULT_UPDATE_TYPES: bot_js_1.DEFAULT_UPDATE_TYPES,
    ALL_UPDATE_TYPES,
    ALL_CHAT_PERMISSIONS
  };
  Object.freeze(exports.API_CONSTANTS);
});

// node_modules/grammy/out/convenience/inline_query.js
var require_inline_query = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.InlineQueryResultBuilder = undefined;
  function inputMessage(queryTemplate) {
    return {
      ...queryTemplate,
      ...inputMessageMethods(queryTemplate)
    };
  }
  function inputMessageMethods(queryTemplate) {
    return {
      text(message_text, options = {}) {
        const content = {
          message_text,
          ...options
        };
        return { ...queryTemplate, input_message_content: content };
      },
      rich(rich_message, options = {}) {
        const content = {
          rich_message,
          ...options
        };
        return { ...queryTemplate, input_message_content: content };
      },
      location(latitude, longitude, options = {}) {
        const content = {
          latitude,
          longitude,
          ...options
        };
        return { ...queryTemplate, input_message_content: content };
      },
      venue(title, latitude, longitude, address, options) {
        const content = {
          title,
          latitude,
          longitude,
          address,
          ...options
        };
        return { ...queryTemplate, input_message_content: content };
      },
      contact(first_name, phone_number, options = {}) {
        const content = {
          first_name,
          phone_number,
          ...options
        };
        return { ...queryTemplate, input_message_content: content };
      },
      invoice(title, description, payload, provider_token, currency, prices, options = {}) {
        const content = {
          title,
          description,
          payload,
          provider_token,
          currency,
          prices,
          ...options
        };
        return { ...queryTemplate, input_message_content: content };
      }
    };
  }
  exports.InlineQueryResultBuilder = {
    article(id, title, options = {}) {
      return inputMessageMethods({ type: "article", id, title, ...options });
    },
    audio(id, title, audio_url, options = {}) {
      return inputMessage({
        type: "audio",
        id,
        title,
        audio_url: typeof audio_url === "string" ? audio_url : audio_url.href,
        ...options
      });
    },
    audioCached(id, audio_file_id, options = {}) {
      return inputMessage({ type: "audio", id, audio_file_id, ...options });
    },
    contact(id, phone_number, first_name, options = {}) {
      return inputMessage({ type: "contact", id, phone_number, first_name, ...options });
    },
    documentPdf(id, title, document_url, options = {}) {
      return inputMessage({
        type: "document",
        mime_type: "application/pdf",
        id,
        title,
        document_url: typeof document_url === "string" ? document_url : document_url.href,
        ...options
      });
    },
    documentZip(id, title, document_url, options = {}) {
      return inputMessage({
        type: "document",
        mime_type: "application/zip",
        id,
        title,
        document_url: typeof document_url === "string" ? document_url : document_url.href,
        ...options
      });
    },
    documentCached(id, title, document_file_id, options = {}) {
      return inputMessage({ type: "document", id, title, document_file_id, ...options });
    },
    game(id, game_short_name, options = {}) {
      return { type: "game", id, game_short_name, ...options };
    },
    gif(id, gif_url, thumbnail_url, options = {}) {
      return inputMessage({
        type: "gif",
        id,
        gif_url: typeof gif_url === "string" ? gif_url : gif_url.href,
        thumbnail_url: typeof thumbnail_url === "string" ? thumbnail_url : thumbnail_url.href,
        ...options
      });
    },
    gifCached(id, gif_file_id, options = {}) {
      return inputMessage({ type: "gif", id, gif_file_id, ...options });
    },
    location(id, title, latitude, longitude, options = {}) {
      return inputMessage({ type: "location", id, title, latitude, longitude, ...options });
    },
    mpeg4gif(id, mpeg4_url, thumbnail_url, options = {}) {
      return inputMessage({
        type: "mpeg4_gif",
        id,
        mpeg4_url: typeof mpeg4_url === "string" ? mpeg4_url : mpeg4_url.href,
        thumbnail_url: typeof thumbnail_url === "string" ? thumbnail_url : thumbnail_url.href,
        ...options
      });
    },
    mpeg4gifCached(id, mpeg4_file_id, options = {}) {
      return inputMessage({ type: "mpeg4_gif", id, mpeg4_file_id, ...options });
    },
    photo(id, photo_url, options = {}) {
      const photoUrl = typeof photo_url === "string" ? photo_url : photo_url.href;
      return inputMessage({
        type: "photo",
        id,
        photo_url: photoUrl,
        thumbnail_url: photoUrl,
        ...options
      });
    },
    photoCached(id, photo_file_id, options = {}) {
      return inputMessage({ type: "photo", id, photo_file_id, ...options });
    },
    stickerCached(id, sticker_file_id, options = {}) {
      return inputMessage({ type: "sticker", id, sticker_file_id, ...options });
    },
    venue(id, title, latitude, longitude, address, options = {}) {
      return inputMessage({
        type: "venue",
        id,
        title,
        latitude,
        longitude,
        address,
        ...options
      });
    },
    videoHtml(id, title, video_url, thumbnail_url, options = {}) {
      return inputMessageMethods({
        type: "video",
        mime_type: "text/html",
        id,
        title,
        video_url: typeof video_url === "string" ? video_url : video_url.href,
        thumbnail_url: typeof thumbnail_url === "string" ? thumbnail_url : thumbnail_url.href,
        ...options
      });
    },
    videoMp4(id, title, video_url, thumbnail_url, options = {}) {
      return inputMessage({
        type: "video",
        mime_type: "video/mp4",
        id,
        title,
        video_url: typeof video_url === "string" ? video_url : video_url.href,
        thumbnail_url: typeof thumbnail_url === "string" ? thumbnail_url : thumbnail_url.href,
        ...options
      });
    },
    videoCached(id, title, video_file_id, options = {}) {
      return inputMessage({ type: "video", id, title, video_file_id, ...options });
    },
    voice(id, title, voice_url, options = {}) {
      return inputMessage({
        type: "voice",
        id,
        title,
        voice_url: typeof voice_url === "string" ? voice_url : voice_url.href,
        ...options
      });
    },
    voiceCached(id, title, voice_file_id, options = {}) {
      return inputMessage({ type: "voice", id, title, voice_file_id, ...options });
    }
  };
});

// node_modules/grammy/out/convenience/input_media.js
var require_input_media = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.InputMediaBuilder = undefined;
  exports.InputMediaBuilder = {
    photo(media, options = {}) {
      return { type: "photo", media, ...options };
    },
    video(media, options = {}) {
      return { type: "video", media, ...options };
    },
    animation(media, options = {}) {
      return { type: "animation", media, ...options };
    },
    audio(media, options = {}) {
      return { type: "audio", media, ...options };
    },
    document(media, options = {}) {
      return { type: "document", media, ...options };
    }
  };
});

// node_modules/grammy/out/convenience/keyboard.js
var require_keyboard = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.InlineKeyboard = exports.Keyboard = undefined;

  class Keyboard {
    constructor(keyboard = [[]]) {
      this.keyboard = keyboard;
    }
    add(...buttons) {
      var _a;
      (_a = this.keyboard[this.keyboard.length - 1]) === null || _a === undefined || _a.push(...buttons);
      return this;
    }
    row(...buttons) {
      this.keyboard.push(buttons);
      return this;
    }
    text(text, options) {
      return this.add(Keyboard.text(text, options));
    }
    static text(text, options) {
      return typeof options === "string" ? { text, style: options } : { text, ...options };
    }
    requestUsers(text, requestId, options = {}) {
      return this.add(Keyboard.requestUsers(text, requestId, options));
    }
    static requestUsers(text, requestId, options = {}) {
      const request_users = { request_id: requestId, ...options };
      return typeof text === "string" ? { text, request_users } : { ...text, request_users };
    }
    requestChat(text, requestId, options = {
      chat_is_channel: false
    }) {
      return this.add(Keyboard.requestChat(text, requestId, options));
    }
    static requestChat(text, requestId, options = {
      chat_is_channel: false
    }) {
      const request_chat = { request_id: requestId, ...options };
      return typeof text === "string" ? { text, request_chat } : { ...text, request_chat };
    }
    requestContact(text) {
      return this.add(Keyboard.requestContact(text));
    }
    static requestContact(text) {
      const request_contact = true;
      return typeof text === "string" ? { text, request_contact } : { ...text, request_contact };
    }
    requestLocation(text) {
      return this.add(Keyboard.requestLocation(text));
    }
    static requestLocation(text) {
      const request_location = true;
      return typeof text === "string" ? { text, request_location } : { ...text, request_location };
    }
    requestPoll(text, type) {
      return this.add(Keyboard.requestPoll(text, type));
    }
    static requestPoll(text, type) {
      const request_poll = { type };
      return typeof text === "string" ? { text, request_poll } : { ...text, request_poll };
    }
    requestManagedBot(text, requestId, options = {}) {
      return this.add(Keyboard.requestManagedBot(text, requestId, options));
    }
    static requestManagedBot(text, requestId, options = {}) {
      const request_managed_bot = { request_id: requestId, ...options };
      return typeof text === "string" ? { text, request_managed_bot } : { ...text, request_managed_bot };
    }
    webApp(text, url) {
      return this.add(Keyboard.webApp(text, url));
    }
    static webApp(text, url) {
      const web_app = { url };
      return typeof text === "string" ? { text, web_app } : { ...text, web_app };
    }
    style(style) {
      const rows = this.keyboard.length;
      if (rows === 0) {
        throw new Error("Need to add a button before applying a style!");
      }
      const lastRow = this.keyboard[rows - 1];
      const cols = lastRow.length;
      if (cols === 0) {
        throw new Error("Need to add a button before applying a style!");
      }
      let lastButton = lastRow[cols - 1];
      if (typeof lastButton === "string") {
        lastButton = { text: lastButton };
        lastRow[cols - 1] = lastButton;
      }
      lastButton.style = style;
      return this;
    }
    danger() {
      return this.style("danger");
    }
    success() {
      return this.style("success");
    }
    primary() {
      return this.style("primary");
    }
    icon(icon) {
      const rows = this.keyboard.length;
      if (rows === 0) {
        throw new Error("Need to add a button before adding an icon!");
      }
      const lastRow = this.keyboard[rows - 1];
      const cols = lastRow.length;
      if (cols === 0) {
        throw new Error("Need to add a button before adding an icon!");
      }
      let lastButton = lastRow[cols - 1];
      if (typeof lastButton === "string") {
        lastButton = { text: lastButton };
        lastRow[cols - 1] = lastButton;
      }
      lastButton.icon_custom_emoji_id = icon;
      return this;
    }
    persistent(isEnabled = true) {
      this.is_persistent = isEnabled;
      return this;
    }
    selected(isEnabled = true) {
      this.selective = isEnabled;
      return this;
    }
    oneTime(isEnabled = true) {
      this.one_time_keyboard = isEnabled;
      return this;
    }
    resized(isEnabled = true) {
      this.resize_keyboard = isEnabled;
      return this;
    }
    placeholder(value) {
      this.input_field_placeholder = value;
      return this;
    }
    forceReply(isEnabled = true) {
      this.force_reply = isEnabled;
      return this;
    }
    toTransposed() {
      const original = this.keyboard;
      const transposed = transpose(original);
      return this.clone(transposed);
    }
    toFlowed(columns, options = {}) {
      const original = this.keyboard;
      const flowed = reflow(original, columns, options);
      return this.clone(flowed);
    }
    clone(keyboard = this.keyboard) {
      const clone = new Keyboard(keyboard.map((row) => row.slice()));
      clone.is_persistent = this.is_persistent;
      clone.selective = this.selective;
      clone.one_time_keyboard = this.one_time_keyboard;
      clone.resize_keyboard = this.resize_keyboard;
      clone.input_field_placeholder = this.input_field_placeholder;
      clone.force_reply = this.force_reply;
      return clone;
    }
    append(...sources) {
      for (const source of sources) {
        const keyboard = Keyboard.from(source);
        this.keyboard.push(...keyboard.keyboard.map((row) => row.slice()));
      }
      return this;
    }
    build() {
      return this.keyboard;
    }
    static from(source) {
      if (source instanceof Keyboard)
        return source.clone();
      function toButton(btn) {
        return typeof btn === "string" ? Keyboard.text(btn) : btn;
      }
      return new Keyboard(source.map((row) => row.map(toButton)));
    }
  }
  exports.Keyboard = Keyboard;

  class InlineKeyboard {
    constructor(inline_keyboard = [[]]) {
      this.inline_keyboard = inline_keyboard;
    }
    add(...buttons) {
      var _a;
      (_a = this.inline_keyboard[this.inline_keyboard.length - 1]) === null || _a === undefined || _a.push(...buttons);
      return this;
    }
    row(...buttons) {
      this.inline_keyboard.push(buttons);
      return this;
    }
    url(text, url) {
      return this.add(InlineKeyboard.url(text, url));
    }
    static url(text, url) {
      return typeof text === "string" ? { text, url } : { ...text, url };
    }
    text(text, data = typeof text === "string" ? text : text.text) {
      return this.add(InlineKeyboard.text(text, data));
    }
    static text(text, data = typeof text === "string" ? text : text.text) {
      return typeof text === "string" ? { text, callback_data: data } : { ...text, callback_data: data };
    }
    webApp(text, url) {
      return this.add(InlineKeyboard.webApp(text, url));
    }
    static webApp(text, url) {
      const web_app = typeof url === "string" ? { url } : url;
      return typeof text === "string" ? { text, web_app } : { ...text, web_app };
    }
    login(text, loginUrl) {
      return this.add(InlineKeyboard.login(text, loginUrl));
    }
    static login(text, loginUrl) {
      const login_url = typeof loginUrl === "string" ? { url: loginUrl } : loginUrl;
      return typeof text === "string" ? { text, login_url } : { ...text, login_url };
    }
    disabled(text) {
      return this.add(InlineKeyboard.disabled(text));
    }
    static disabled(text) {
      return typeof text === "string" ? { text, disabled: {} } : { ...text, disabled: {} };
    }
    switchInline(text, query = "") {
      return this.add(InlineKeyboard.switchInline(text, query));
    }
    static switchInline(text, query = "") {
      return typeof text === "string" ? { text, switch_inline_query: query } : { ...text, switch_inline_query: query };
    }
    switchInlineCurrent(text, query = "") {
      return this.add(InlineKeyboard.switchInlineCurrent(text, query));
    }
    static switchInlineCurrent(text, query = "") {
      return typeof text === "string" ? { text, switch_inline_query_current_chat: query } : { ...text, switch_inline_query_current_chat: query };
    }
    switchInlineChosen(text, query = {}) {
      return this.add(InlineKeyboard.switchInlineChosen(text, query));
    }
    static switchInlineChosen(text, query = {}) {
      return typeof text === "string" ? { text, switch_inline_query_chosen_chat: query } : { ...text, switch_inline_query_chosen_chat: query };
    }
    copyText(text, copyText) {
      return this.add(InlineKeyboard.copyText(text, copyText));
    }
    static copyText(text, copyText) {
      const copy_text = typeof copyText === "string" ? { text: copyText } : copyText;
      return typeof text === "string" ? { text, copy_text } : { ...text, copy_text };
    }
    game(text) {
      return this.add(InlineKeyboard.game(text));
    }
    static game(text) {
      const callback_game = {};
      return typeof text === "string" ? { text, callback_game } : { ...text, callback_game };
    }
    pay(text) {
      return this.add(InlineKeyboard.pay(text));
    }
    static pay(text) {
      const pay = true;
      return typeof text === "string" ? { text, pay } : { ...text, pay };
    }
    style(style) {
      const rows = this.inline_keyboard.length;
      if (rows === 0) {
        throw new Error("Need to add a button before applying a style!");
      }
      const lastRow = this.inline_keyboard[rows - 1];
      const cols = lastRow.length;
      if (cols === 0) {
        throw new Error("Need to add a button before applying a style!");
      }
      lastRow[cols - 1].style = style;
      return this;
    }
    danger() {
      return this.style("danger");
    }
    success() {
      return this.style("success");
    }
    primary() {
      return this.style("primary");
    }
    icon(icon) {
      const rows = this.inline_keyboard.length;
      if (rows === 0) {
        throw new Error("Need to add a button before adding an icon!");
      }
      const lastRow = this.inline_keyboard[rows - 1];
      const cols = lastRow.length;
      if (cols === 0) {
        throw new Error("Need to add a button before adding an icon!");
      }
      lastRow[cols - 1].icon_custom_emoji_id = icon;
      return this;
    }
    forceReply(isEnabled = true) {
      this.force_reply = isEnabled;
      return this;
    }
    toTransposed() {
      const original = this.inline_keyboard;
      const transposed = transpose(original);
      return this.clone(transposed);
    }
    toFlowed(columns, options = {}) {
      const original = this.inline_keyboard;
      const flowed = reflow(original, columns, options);
      return this.clone(flowed);
    }
    clone(inline_keyboard = this.inline_keyboard) {
      const clone = new InlineKeyboard(inline_keyboard.map((row) => row.slice()));
      clone.force_reply = this.force_reply;
      return clone;
    }
    append(...sources) {
      for (const source of sources) {
        const keyboard = InlineKeyboard.from(source);
        this.inline_keyboard.push(...keyboard.inline_keyboard.map((row) => row.slice()));
      }
      return this;
    }
    static from(source) {
      if (source instanceof InlineKeyboard)
        return source.clone();
      return new InlineKeyboard(source.map((row) => row.slice()));
    }
  }
  exports.InlineKeyboard = InlineKeyboard;
  function transpose(grid) {
    var _a;
    const transposed = [];
    for (let i = 0;i < grid.length; i++) {
      const row = grid[i];
      for (let j = 0;j < row.length; j++) {
        const button = row[j];
        ((_a = transposed[j]) !== null && _a !== undefined ? _a : transposed[j] = []).push(button);
      }
    }
    return transposed;
  }
  function reflow(grid, columns, { fillLastRow = false }) {
    var _a;
    let first = columns;
    if (fillLastRow) {
      const buttonCount = grid.map((row) => row.length).reduce((a, b) => a + b, 0);
      first = buttonCount % columns;
    }
    const reflowed = [];
    for (const row of grid) {
      for (const button of row) {
        const at = Math.max(0, reflowed.length - 1);
        const max = at === 0 ? first : columns;
        let next = (_a = reflowed[at]) !== null && _a !== undefined ? _a : reflowed[at] = [];
        if (next.length === max) {
          next = [];
          reflowed.push(next);
        }
        next.push(button);
      }
    }
    return reflowed;
  }
});

// node_modules/grammy/out/convenience/session.js
var require_session = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.MemorySessionStorage = undefined;
  exports.session = session;
  exports.lazySession = lazySession;
  exports.enhanceStorage = enhanceStorage;
  var platform_node_js_1 = require_platform_node();
  var debug = (0, platform_node_js_1.debug)("grammy:session");
  function session(options = {}) {
    return options.type === "multi" ? strictMultiSession(options) : strictSingleSession(options);
  }
  function strictSingleSession(options) {
    const { initial, storage, getSessionKey, custom } = fillDefaults(options);
    return async (ctx, next) => {
      const propSession = new PropertySession(storage, ctx, "session", initial);
      const key = await getSessionKey(ctx);
      await propSession.init(key, { custom, lazy: false });
      await next();
      await propSession.finish();
    };
  }
  function strictMultiSession(options) {
    const props = Object.keys(options).filter((k) => k !== "type");
    const defaults = Object.fromEntries(props.map((prop) => [prop, fillDefaults(options[prop])]));
    return async (ctx, next) => {
      ctx.session = {};
      const propSessions = await Promise.all(props.map(async (prop) => {
        const { initial, storage, getSessionKey, custom } = defaults[prop];
        const s = new PropertySession(storage, ctx.session, prop, initial);
        const key = await getSessionKey(ctx);
        await s.init(key, { custom, lazy: false });
        return s;
      }));
      await next();
      if (ctx.session == null)
        propSessions.forEach((s) => s.delete());
      await Promise.all(propSessions.map((s) => s.finish()));
    };
  }
  function lazySession(options = {}) {
    if (options.type !== undefined && options.type !== "single") {
      throw new Error("Cannot use lazy multi sessions!");
    }
    const { initial, storage, getSessionKey, custom } = fillDefaults(options);
    return async (ctx, next) => {
      const propSession = new PropertySession(storage, ctx, "session", initial);
      const key = await getSessionKey(ctx);
      await propSession.init(key, { custom, lazy: true });
      await next();
      await propSession.finish();
    };
  }

  class PropertySession {
    constructor(storage, obj, prop, initial) {
      this.storage = storage;
      this.obj = obj;
      this.prop = prop;
      this.initial = initial;
      this.fetching = false;
      this.read = false;
      this.wrote = false;
    }
    load() {
      if (this.key === undefined) {
        return;
      }
      if (this.wrote) {
        return;
      }
      if (this.promise === undefined) {
        this.fetching = true;
        this.promise = Promise.resolve(this.storage.read(this.key)).then((val) => {
          var _a;
          this.fetching = false;
          if (this.wrote) {
            return this.value;
          }
          if (val !== undefined) {
            this.value = val;
            return val;
          }
          val = (_a = this.initial) === null || _a === undefined ? undefined : _a.call(this);
          if (val !== undefined) {
            this.wrote = true;
            this.value = val;
          }
          return val;
        });
      }
      return this.promise;
    }
    async init(key, opts) {
      this.key = key;
      if (!opts.lazy)
        await this.load();
      Object.defineProperty(this.obj, this.prop, {
        enumerable: true,
        get: () => {
          if (key === undefined) {
            const msg = undef("access", opts);
            throw new Error(msg);
          }
          this.read = true;
          if (!opts.lazy || this.wrote)
            return this.value;
          this.load();
          return this.fetching ? this.promise : this.value;
        },
        set: (v) => {
          if (key === undefined) {
            const msg = undef("assign", opts);
            throw new Error(msg);
          }
          this.wrote = true;
          this.fetching = false;
          this.value = v;
        }
      });
    }
    delete() {
      Object.assign(this.obj, { [this.prop]: undefined });
    }
    async finish() {
      if (this.key !== undefined) {
        if (this.read)
          await this.load();
        if (this.read || this.wrote) {
          const value = await this.value;
          if (value == null)
            await this.storage.delete(this.key);
          else
            await this.storage.write(this.key, value);
        }
      }
    }
  }
  function fillDefaults(opts = {}) {
    let { prefix = "", getSessionKey = defaultGetSessionKey, initial, storage } = opts;
    if (storage == null) {
      debug("Storing session data in memory, all data will be lost when the bot restarts.");
      storage = new MemorySessionStorage;
    }
    const custom = getSessionKey !== defaultGetSessionKey;
    return {
      initial,
      storage,
      getSessionKey: async (ctx) => {
        const key = await getSessionKey(ctx);
        return key === undefined ? undefined : prefix + key;
      },
      custom
    };
  }
  function defaultGetSessionKey(ctx) {
    var _a;
    return (_a = ctx.chatId) === null || _a === undefined ? undefined : _a.toString();
  }
  function undef(op, opts) {
    const { lazy = false, custom } = opts;
    const reason = custom ? "the custom `getSessionKey` function returned undefined for this update" : "this update does not belong to a chat, so the session key is undefined";
    return `Cannot ${op} ${lazy ? "lazy " : ""}session data because ${reason}!`;
  }
  function isEnhance(value) {
    return value === undefined || typeof value === "object" && value !== null && "__d" in value;
  }
  function enhanceStorage(options) {
    let { storage, millisecondsToLive, migrations } = options;
    storage = compatStorage(storage);
    if (millisecondsToLive !== undefined) {
      storage = timeoutStorage(storage, millisecondsToLive);
    }
    if (migrations !== undefined) {
      storage = migrationStorage(storage, migrations);
    }
    return wrapStorage(storage);
  }
  function compatStorage(storage) {
    return {
      read: async (k) => {
        const v = await storage.read(k);
        return isEnhance(v) ? v : { __d: v };
      },
      write: (k, v) => storage.write(k, v),
      delete: (k) => storage.delete(k)
    };
  }
  function timeoutStorage(storage, millisecondsToLive) {
    const ttlStorage = {
      read: async (k) => {
        const value = await storage.read(k);
        if (value === undefined)
          return;
        if (value.e === undefined) {
          await ttlStorage.write(k, value);
          return value;
        }
        if (value.e < Date.now()) {
          await ttlStorage.delete(k);
          return;
        }
        return value;
      },
      write: async (k, v) => {
        v.e = addExpiryDate(v, millisecondsToLive).expires;
        await storage.write(k, v);
      },
      delete: (k) => storage.delete(k)
    };
    return ttlStorage;
  }
  function migrationStorage(storage, migrations) {
    const versions = Object.keys(migrations).map((v) => parseInt(v)).sort((a, b) => a - b);
    const count = versions.length;
    if (count === 0)
      throw new Error("No migrations given!");
    const earliest = versions[0];
    const last = count - 1;
    const latest = versions[last];
    const index = new Map;
    versions.forEach((v, i) => index.set(v, i));
    function nextAfter(current) {
      let i = last;
      while (current <= versions[i])
        i--;
      return i;
    }
    return {
      read: async (k) => {
        var _a;
        const val = await storage.read(k);
        if (val === undefined)
          return val;
        let { __d: value, v: current = earliest - 1 } = val;
        let i = 1 + ((_a = index.get(current)) !== null && _a !== undefined ? _a : nextAfter(current));
        for (;i < count; i++)
          value = migrations[versions[i]](value);
        return { ...val, v: latest, __d: value };
      },
      write: (k, v) => storage.write(k, { v: latest, ...v }),
      delete: (k) => storage.delete(k)
    };
  }
  function wrapStorage(storage) {
    return {
      read: (k) => Promise.resolve(storage.read(k)).then((v) => v === null || v === undefined ? undefined : v.__d),
      write: (k, v) => storage.write(k, { __d: v }),
      delete: (k) => storage.delete(k)
    };
  }

  class MemorySessionStorage {
    constructor(timeToLive) {
      this.timeToLive = timeToLive;
      this.storage = new Map;
    }
    read(key) {
      const value = this.storage.get(key);
      if (value === undefined)
        return;
      if (value.expires !== undefined && value.expires < Date.now()) {
        this.delete(key);
        return;
      }
      return value.session;
    }
    readAll() {
      return this.readAllValues();
    }
    readAllKeys() {
      return Array.from(this.storage.keys());
    }
    readAllValues() {
      return Array.from(this.storage.keys()).map((key) => this.read(key)).filter((value) => value !== undefined);
    }
    readAllEntries() {
      return Array.from(this.storage.keys()).map((key) => [key, this.read(key)]).filter((pair) => pair[1] !== undefined);
    }
    has(key) {
      return this.storage.has(key);
    }
    write(key, value) {
      this.storage.set(key, addExpiryDate(value, this.timeToLive));
    }
    delete(key) {
      this.storage.delete(key);
    }
  }
  exports.MemorySessionStorage = MemorySessionStorage;
  function addExpiryDate(value, ttl) {
    if (ttl !== undefined && ttl < Infinity) {
      const now = Date.now();
      return { session: value, expires: now + ttl };
    } else {
      return { session: value };
    }
  }
});

// node_modules/grammy/out/convenience/frameworks.js
var require_frameworks = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.adapters = undefined;
  var SECRET_HEADER = "X-Telegram-Bot-Api-Secret-Token";
  var SECRET_HEADER_LOWERCASE = SECRET_HEADER.toLowerCase();
  var WRONG_TOKEN_ERROR = "secret token is wrong";
  var ok = () => new Response(null, { status: 200 });
  var okJson = (json) => new Response(json, {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
  var unauthorized = () => new Response('"unauthorized"', {
    status: 401,
    statusText: WRONG_TOKEN_ERROR
  });
  var awsLambda = (event, _context, callback) => {
    var _a;
    return {
      get update() {
        var _a2;
        return JSON.parse((_a2 = event.body) !== null && _a2 !== undefined ? _a2 : "{}");
      },
      header: (_a = event.headers[SECRET_HEADER]) !== null && _a !== undefined ? _a : event.headers[SECRET_HEADER_LOWERCASE],
      end: () => callback(null, { statusCode: 200 }),
      respond: (json) => callback(null, {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: json
      }),
      unauthorized: () => callback(null, { statusCode: 401 })
    };
  };
  var awsLambdaAsync = (event, _context) => {
    var _a;
    let resolveResponse;
    return {
      get update() {
        var _a2;
        return JSON.parse((_a2 = event.body) !== null && _a2 !== undefined ? _a2 : "{}");
      },
      header: (_a = event.headers[SECRET_HEADER]) !== null && _a !== undefined ? _a : event.headers[SECRET_HEADER_LOWERCASE],
      end: () => resolveResponse({ statusCode: 200 }),
      respond: (json) => resolveResponse({
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: json
      }),
      unauthorized: () => resolveResponse({ statusCode: 401 }),
      handlerReturn: new Promise((res) => resolveResponse = res)
    };
  };
  var azure = (context, request) => {
    var _a;
    return {
      get update() {
        return request.body;
      },
      header: (_a = request.headers) === null || _a === undefined ? undefined : _a[SECRET_HEADER_LOWERCASE],
      end: () => context.res = {
        status: 200,
        body: ""
      },
      respond: (json) => {
        var _a2, _b, _c, _d;
        (_b = (_a2 = context.res) === null || _a2 === undefined ? undefined : _a2.set) === null || _b === undefined || _b.call(_a2, "Content-Type", "application/json");
        (_d = (_c = context.res) === null || _c === undefined ? undefined : _c.send) === null || _d === undefined || _d.call(_c, json);
      },
      unauthorized: () => {
        var _a2, _b;
        (_b = (_a2 = context.res) === null || _a2 === undefined ? undefined : _a2.send) === null || _b === undefined || _b.call(_a2, 401, WRONG_TOKEN_ERROR);
      }
    };
  };
  var azureV4 = (request) => {
    let resolveResponse;
    return {
      get update() {
        return request.json();
      },
      header: request.headers.get(SECRET_HEADER) || undefined,
      end: () => resolveResponse({ status: 204 }),
      respond: (json) => resolveResponse({ jsonBody: json }),
      unauthorized: () => resolveResponse({ status: 401, body: WRONG_TOKEN_ERROR }),
      handlerReturn: new Promise((resolve) => resolveResponse = resolve)
    };
  };
  var bun = (request) => {
    let resolveResponse;
    return {
      get update() {
        return request.json();
      },
      header: request.headers.get(SECRET_HEADER) || undefined,
      end: () => {
        resolveResponse(ok());
      },
      respond: (json) => {
        resolveResponse(okJson(json));
      },
      unauthorized: () => {
        resolveResponse(unauthorized());
      },
      handlerReturn: new Promise((res) => resolveResponse = res)
    };
  };
  var cloudflare = (event) => {
    let resolveResponse;
    event.respondWith(new Promise((resolve) => {
      resolveResponse = resolve;
    }));
    return {
      get update() {
        return event.request.json();
      },
      header: event.request.headers.get(SECRET_HEADER) || undefined,
      end: () => {
        resolveResponse(ok());
      },
      respond: (json) => {
        resolveResponse(okJson(json));
      },
      unauthorized: () => {
        resolveResponse(unauthorized());
      }
    };
  };
  var cloudflareModule = (request) => {
    let resolveResponse;
    return {
      get update() {
        return request.json();
      },
      header: request.headers.get(SECRET_HEADER) || undefined,
      end: () => {
        resolveResponse(ok());
      },
      respond: (json) => {
        resolveResponse(okJson(json));
      },
      unauthorized: () => {
        resolveResponse(unauthorized());
      },
      handlerReturn: new Promise((res) => resolveResponse = res)
    };
  };
  var express = (req, res) => ({
    get update() {
      return req.body;
    },
    header: req.header(SECRET_HEADER),
    end: () => res.end(),
    respond: (json) => {
      res.set("Content-Type", "application/json");
      res.send(json);
    },
    unauthorized: () => {
      res.status(401).send(WRONG_TOKEN_ERROR);
    }
  });
  var fastify = (request, reply) => ({
    get update() {
      return request.body;
    },
    header: request.headers[SECRET_HEADER_LOWERCASE],
    end: () => reply.send(""),
    respond: (json) => reply.headers({ "Content-Type": "application/json" }).send(json),
    unauthorized: () => reply.code(401).send(WRONG_TOKEN_ERROR)
  });
  var hono = (c) => {
    let resolveResponse;
    return {
      get update() {
        return c.req.json();
      },
      header: c.req.header(SECRET_HEADER),
      end: () => {
        resolveResponse(c.body(""));
      },
      respond: (json) => {
        resolveResponse(c.json(json));
      },
      unauthorized: () => {
        c.status(401);
        resolveResponse(c.body(""));
      },
      handlerReturn: new Promise((res) => resolveResponse = res)
    };
  };
  var http = (req, res) => {
    const secretHeaderFromRequest = req.headers[SECRET_HEADER_LOWERCASE];
    return {
      get update() {
        return new Promise((resolve, reject) => {
          const chunks = [];
          req.on("data", (chunk) => chunks.push(chunk)).once("end", () => {
            const raw = Buffer.concat(chunks).toString("utf-8");
            try {
              resolve(JSON.parse(raw));
            } catch (err) {
              reject(err);
            }
          }).once("error", reject);
        });
      },
      header: Array.isArray(secretHeaderFromRequest) ? secretHeaderFromRequest[0] : secretHeaderFromRequest,
      end: () => res.end(),
      respond: (json) => res.writeHead(200, { "Content-Type": "application/json" }).end(json),
      unauthorized: () => res.writeHead(401).end(WRONG_TOKEN_ERROR)
    };
  };
  var koa = (ctx) => ({
    get update() {
      return ctx.request.body;
    },
    header: ctx.get(SECRET_HEADER) || undefined,
    end: () => {
      ctx.body = "";
    },
    respond: (json) => {
      ctx.set("Content-Type", "application/json");
      ctx.response.body = json;
    },
    unauthorized: () => {
      ctx.status = 401;
    }
  });
  var nextJs = (request, response) => ({
    get update() {
      return request.body;
    },
    header: request.headers[SECRET_HEADER_LOWERCASE],
    end: () => response.end(),
    respond: (json) => response.status(200).json(json),
    unauthorized: () => response.status(401).send(WRONG_TOKEN_ERROR)
  });
  var nhttp = (rev) => ({
    get update() {
      return rev.body;
    },
    header: rev.headers.get(SECRET_HEADER) || undefined,
    end: () => rev.response.sendStatus(200),
    respond: (json) => rev.response.status(200).send(json),
    unauthorized: () => rev.response.status(401).send(WRONG_TOKEN_ERROR)
  });
  var oak = (ctx) => ({
    get update() {
      return ctx.request.body.json();
    },
    header: ctx.request.headers.get(SECRET_HEADER) || undefined,
    end: () => {
      ctx.response.status = 200;
    },
    respond: (json) => {
      ctx.response.type = "json";
      ctx.response.body = json;
    },
    unauthorized: () => {
      ctx.response.status = 401;
    }
  });
  var serveHttp = (requestEvent) => ({
    get update() {
      return requestEvent.request.json();
    },
    header: requestEvent.request.headers.get(SECRET_HEADER) || undefined,
    end: () => requestEvent.respondWith(ok()),
    respond: (json) => requestEvent.respondWith(okJson(json)),
    unauthorized: () => requestEvent.respondWith(unauthorized())
  });
  var stdHttp = (req) => {
    let resolveResponse;
    return {
      get update() {
        return req.json();
      },
      header: req.headers.get(SECRET_HEADER) || undefined,
      end: () => {
        if (resolveResponse)
          resolveResponse(ok());
      },
      respond: (json) => {
        if (resolveResponse)
          resolveResponse(okJson(json));
      },
      unauthorized: () => {
        if (resolveResponse)
          resolveResponse(unauthorized());
      },
      handlerReturn: new Promise((res) => resolveResponse = res)
    };
  };
  var sveltekit = ({ request }) => {
    let resolveResponse;
    return {
      get update() {
        return request.json();
      },
      header: request.headers.get(SECRET_HEADER) || undefined,
      end: () => {
        if (resolveResponse)
          resolveResponse(ok());
      },
      respond: (json) => {
        if (resolveResponse)
          resolveResponse(okJson(json));
      },
      unauthorized: () => {
        if (resolveResponse)
          resolveResponse(unauthorized());
      },
      handlerReturn: new Promise((res) => resolveResponse = res)
    };
  };
  var worktop = (req, res) => {
    var _a;
    return {
      get update() {
        return req.json();
      },
      header: (_a = req.headers.get(SECRET_HEADER)) !== null && _a !== undefined ? _a : undefined,
      end: () => res.end(null),
      respond: (json) => res.send(200, json),
      unauthorized: () => res.send(401, WRONG_TOKEN_ERROR)
    };
  };
  var elysia = (ctx) => {
    let resolveResponse;
    return {
      get update() {
        return ctx.body;
      },
      header: ctx.headers[SECRET_HEADER_LOWERCASE],
      end() {
        resolveResponse("");
      },
      respond(json) {
        ctx.set.headers["content-type"] = "application/json";
        resolveResponse(json);
      },
      unauthorized() {
        ctx.set.status = 401;
        resolveResponse("");
      },
      handlerReturn: new Promise((res) => resolveResponse = res)
    };
  };
  exports.adapters = {
    "aws-lambda": awsLambda,
    "aws-lambda-async": awsLambdaAsync,
    azure,
    "azure-v4": azureV4,
    bun,
    cloudflare,
    "cloudflare-mod": cloudflareModule,
    elysia,
    express,
    fastify,
    hono,
    http,
    https: http,
    koa,
    "next-js": nextJs,
    nhttp,
    oak,
    serveHttp,
    "std/http": stdHttp,
    sveltekit,
    worktop
  };
});

// node_modules/grammy/out/convenience/webhook.js
var require_webhook = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.webhookCallback = webhookCallback;
  var platform_node_js_1 = require_platform_node();
  var frameworks_js_1 = require_frameworks();
  var debugErr = (0, platform_node_js_1.debug)("grammy:error");
  var callbackAdapter = (update, callback, header, unauthorized = () => callback('"unauthorized"')) => ({
    update: Promise.resolve(update),
    respond: callback,
    header,
    unauthorized
  });
  var adapters = { ...frameworks_js_1.adapters, callback: callbackAdapter };
  function compareSecretToken(header, token) {
    if (token === undefined) {
      return true;
    }
    if (header === undefined) {
      return false;
    }
    const encoder = new TextEncoder;
    const headerBytes = encoder.encode(header);
    const tokenBytes = encoder.encode(token);
    if (headerBytes.length !== tokenBytes.length) {
      return false;
    }
    let hasDifference = 0;
    for (let i = 0;i < tokenBytes.length; i++) {
      const headerByte = headerBytes[i];
      const tokenByte = tokenBytes[i];
      hasDifference |= headerByte ^ tokenByte;
    }
    return hasDifference === 0;
  }
  function webhookCallback(bot, adapter = platform_node_js_1.defaultAdapter, onTimeout, timeoutMilliseconds, secretToken) {
    if (bot.isRunning()) {
      throw new Error("Bot is already running via long polling, the webhook setup won't receive any updates!");
    } else {
      bot.start = () => {
        throw new Error("You already started the bot via webhooks, calling `bot.start()` starts the bot with long polling and this will prevent your webhook setup from receiving any updates!");
      };
    }
    const { onTimeout: timeout = "throw", timeoutMilliseconds: ms = 1e4, secretToken: token } = typeof onTimeout === "object" ? onTimeout : { onTimeout, timeoutMilliseconds, secretToken };
    let initialized = false;
    const server = typeof adapter === "string" ? adapters[adapter] : adapter;
    return async (...args) => {
      var _a;
      const handler = server(...args);
      if (!initialized) {
        await bot.init();
        initialized = true;
      }
      if (!compareSecretToken(handler.header, token)) {
        await handler.unauthorized();
        return handler.handlerReturn;
      }
      let usedWebhookReply = false;
      const webhookReplyEnvelope = {
        async send(json) {
          usedWebhookReply = true;
          await handler.respond(json);
        }
      };
      await timeoutIfNecessary(bot.handleUpdate(await handler.update, webhookReplyEnvelope), typeof timeout === "function" ? () => timeout(...args) : timeout, ms);
      if (!usedWebhookReply)
        (_a = handler.end) === null || _a === undefined || _a.call(handler);
      return handler.handlerReturn;
    };
  }
  function timeoutIfNecessary(task, onTimeout, timeout) {
    if (timeout === Infinity)
      return task;
    return new Promise((resolve, reject) => {
      const handle = setTimeout(() => {
        debugErr(`Request timed out after ${timeout} ms`);
        if (onTimeout === "throw") {
          reject(new Error(`Request timed out after ${timeout} ms`));
        } else {
          if (typeof onTimeout === "function")
            onTimeout();
          resolve();
        }
        const now = Date.now();
        task.finally(() => {
          const diff = Date.now() - now;
          debugErr(`Request completed ${diff} ms after timeout!`);
        });
      }, timeout);
      task.then(resolve).catch(reject).finally(() => clearTimeout(handle));
    });
  }
});

// node_modules/grammy/out/mod.js
var require_mod = __commonJS(function(exports) {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    o[k2] = m[k];
  });
  var __exportStar = exports && exports.__exportStar || function(m, exports2) {
    for (var p in m)
      if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p))
        __createBinding(exports2, m, p);
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.HttpError = exports.GrammyError = exports.Api = exports.matchFilter = exports.Composer = exports.Context = exports.InputFile = exports.BotError = exports.Bot = undefined;
  var bot_js_1 = require_bot();
  Object.defineProperty(exports, "Bot", { enumerable: true, get: function() {
    return bot_js_1.Bot;
  } });
  Object.defineProperty(exports, "BotError", { enumerable: true, get: function() {
    return bot_js_1.BotError;
  } });
  var types_js_1 = require_types();
  Object.defineProperty(exports, "InputFile", { enumerable: true, get: function() {
    return types_js_1.InputFile;
  } });
  var context_js_1 = require_context();
  Object.defineProperty(exports, "Context", { enumerable: true, get: function() {
    return context_js_1.Context;
  } });
  __exportStar(require_constants(), exports);
  __exportStar(require_inline_query(), exports);
  __exportStar(require_input_media(), exports);
  __exportStar(require_keyboard(), exports);
  __exportStar(require_session(), exports);
  __exportStar(require_webhook(), exports);
  var composer_js_1 = require_composer();
  Object.defineProperty(exports, "Composer", { enumerable: true, get: function() {
    return composer_js_1.Composer;
  } });
  var filter_js_1 = require_filter();
  Object.defineProperty(exports, "matchFilter", { enumerable: true, get: function() {
    return filter_js_1.matchFilter;
  } });
  var api_js_1 = require_api();
  Object.defineProperty(exports, "Api", { enumerable: true, get: function() {
    return api_js_1.Api;
  } });
  var error_js_1 = require_error();
  Object.defineProperty(exports, "GrammyError", { enumerable: true, get: function() {
    return error_js_1.GrammyError;
  } });
  Object.defineProperty(exports, "HttpError", { enumerable: true, get: function() {
    return error_js_1.HttpError;
  } });
});

// src/entry/webhook.ts
var import_grammy9 = __toESM(require_mod(), 1);

// src/bot.ts
var import_grammy8 = __toESM(require_mod(), 1);

// src/admin.ts
var import_grammy5 = __toESM(require_mod(), 1);

// src/config.ts
var cached;
function req(name) {
  const v = process.env[name];
  if (!v)
    throw new Error(`env ${name} is not set`);
  return v;
}
function config() {
  return cached ??= {
    botToken: req("BOT_TOKEN"),
    webhookSecret: req("WEBHOOK_SECRET"),
    cronSecret: process.env.CRON_SECRET ?? "",
    databaseUrl: req("DATABASE_URL"),
    channelId: Number(req("CHANNEL_ID")),
    channelUsername: process.env.CHANNEL_USERNAME ?? "frinu_store",
    adminIds: (process.env.ADMIN_IDS ?? "").split(",").map((s) => Number(s.trim())).filter((n) => Number.isSafeInteger(n) && n !== 0),
    modChatId: process.env.MOD_CHAT_ID ? Number(process.env.MOD_CHAT_ID) : null,
    moderation: (process.env.MODERATION ?? "on").toLowerCase() !== "off",
    dailyLimit: Number(process.env.DAILY_LIMIT ?? 10) || 10
  };
}
var isAdmin = (userId) => config().adminIds.includes(userId);

// src/plugin-header.ts
var MAX_FILE_BYTES = 5 * 1024 * 1024;
var BLOCK = /^[ \t]*\/\/[ \t]*==InuPlugin==[ \t]*\r?\n([\s\S]*?)^[ \t]*\/\/[ \t]*==\/InuPlugin==/m;
function parseHeader(src) {
  const block = BLOCK.exec(src);
  if (!block)
    return null;
  const header = { grants: [] };
  for (const raw of block[1].split(/\r?\n/)) {
    const m = /^[ \t]*\/\/[ \t]*@([A-Za-z][\w-]*)[ \t]*(.*?)[ \t]*$/.exec(raw);
    if (!m)
      continue;
    const key = m[1].toLowerCase();
    const value = m[2];
    if (key === "grant") {
      if (value)
        header.grants.push(value);
    } else if (value && (key === "id" || key === "name" || key === "author" || key === "version" || key === "description" || key === "icon")) {
      header[key] ??= value;
    }
  }
  return header;
}
function decodeText(buf) {
  if (buf.includes(0))
    return { ok: false, error: "\u0444\u0430\u0439\u043B \u043F\u043E\u0445\u043E\u0436 \u043D\u0430 \u0431\u0438\u043D\u0430\u0440\u043D\u044B\u0439 (\u0435\u0441\u0442\u044C \u043D\u0443\u043B\u0435\u0432\u044B\u0435 \u0431\u0430\u0439\u0442\u044B)" };
  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(buf) };
  } catch {
    return { ok: false, error: "\u0444\u0430\u0439\u043B \u043D\u0435 \u0432 \u043A\u043E\u0434\u0438\u0440\u043E\u0432\u043A\u0435 UTF-8" };
  }
}
var bare = (grant, name) => grant === name || grant === `${name}()` || grant === `${name}(*)` || grant.startsWith(`${name}(*`);
function analyzeGrants(grants) {
  if (!grants)
    return { unknown: true, unsafe: [], risky: [] };
  return {
    unknown: false,
    unsafe: grants.filter((g) => g.startsWith("unsafe.")),
    risky: grants.filter((g) => bare(g, "fetch") || bare(g, "invokeRpc"))
  };
}
function newUnsafe(grants, previous) {
  const seen = new Set(previous.flat());
  return analyzeGrants(grants).unsafe.filter((g) => !seen.has(g));
}

// src/publish.ts
var import_grammy = __toESM(require_mod(), 1);

// src/semver.ts
var RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;
function parseSemver(v) {
  const m = RE.exec(v);
  if (!m)
    return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ? m[4].split(".") : [] };
}
function cmpPre(a, b) {
  if (!a.length || !b.length)
    return a.length === b.length ? 0 : a.length ? -1 : 1;
  for (let i = 0;i < Math.max(a.length, b.length); i++) {
    const x = a[i];
    const y = b[i];
    if (x === undefined)
      return -1;
    if (y === undefined)
      return 1;
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) {
      if (+x !== +y)
        return +x < +y ? -1 : 1;
    } else if (xn !== yn) {
      return xn ? -1 : 1;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}
function compareSemver(a, b) {
  const x = parseSemver(a);
  const y = parseSemver(b);
  if (!x || !y)
    throw new Error(`invalid semver: ${!x ? a : b}`);
  return x.major - y.major || x.minor - y.minor || x.patch - y.patch || cmpPre(x.pre, y.pre);
}
function maxSemver(versions) {
  let best = null;
  for (const v of versions)
    if (parseSemver(v) && (best === null || compareSemver(v, best) > 0))
      best = v;
  return best;
}

// src/catalog.ts
var MAX_CATALOG_BYTES = 1024 * 1024;
function buildCatalog(plugins, versions, installs, now, screenshots = new Map) {
  const out = [];
  for (const p of plugins) {
    if (p.hidden || !p.repo)
      continue;
    const vs = versions.filter((v) => v.pluginId === p.id && v.status === "approved" && v.msgId !== null).sort((a, b) => b.date - a.date || compareSemver(b.version, a.version)).map((v) => {
      const cv = { version: v.version, msgId: v.msgId, date: v.date };
      if (v.changelog)
        cv.changelog = v.changelog;
      if (v.grants)
        cv.grants = v.grants;
      return cv;
    });
    if (!vs.length)
      continue;
    const shots = (screenshots.get(p.id) ?? []).slice(0, 8);
    out.push({
      id: p.id,
      name: p.name,
      author: p.author,
      description: p.description,
      icon: p.icon,
      repo: p.repo,
      ...shots.length ? { screenshots: shots } : {},
      installs: installs.get(p.id) ?? 0,
      versions: vs
    });
  }
  out.sort((a, b) => b.installs - a.installs || b.versions[0].date - a.versions[0].date || a.id.localeCompare(b.id));
  return { schema: 1, updatedAt: now, plugins: out };
}
function serializeCatalog(c) {
  const json = JSON.stringify(c);
  if (new TextEncoder().encode(json).length >= MAX_CATALOG_BYTES)
    throw new Error("catalog.json \u043F\u0440\u0435\u0432\u044B\u0441\u0438\u043B 1 \u041C\u0411");
  return json;
}
function catalogFingerprint(c) {
  return new Bun.CryptoHasher("sha256").update(JSON.stringify({ ...c, updatedAt: 0 })).digest("hex");
}

// node_modules/@neondatabase/serverless/index.mjs
var Po = Object.create;
var Ie = Object.defineProperty;
var Ro = Object.getOwnPropertyDescriptor;
var Lo = Object.getOwnPropertyNames;
var Bo = Object.getPrototypeOf;
var Fo = Object.prototype.hasOwnProperty;
var Mo = (r, e, t) => (e in r) ? Ie(r, e, { enumerable: true, configurable: true, writable: true, value: t }) : r[e] = t;
var a = (r, e) => Ie(r, "name", { value: e, configurable: true });
var V = (r, e, t) => () => {
  if (t)
    throw t[0];
  try {
    return r && (e = r(r = 0)), e;
  } catch (n) {
    throw t = [n], n;
  }
};
var T = (r, e) => () => {
  try {
    return e || r((e = { exports: {} }).exports, e), e.exports;
  } catch (t) {
    throw e = 0, t;
  }
};
var se = (r, e) => {
  for (var t in e)
    Ie(r, t, { get: e[t], enumerable: true });
};
var Dn = (r, e, t, n) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let i of Lo(e))
      !Fo.call(r, i) && i !== t && Ie(r, i, { get: () => e[i], enumerable: !(n = Ro(e, i)) || n.enumerable });
  return r;
};
var we = (r, e, t) => (t = r != null ? Po(Bo(r)) : {}, Dn(e || !r || !r.__esModule ? Ie(t, "default", { value: r, enumerable: true }) : t, r));
var O = (r) => Dn(Ie({}, "__esModule", { value: true }), r);
var E = (r, e, t) => Mo(r, typeof e != "symbol" ? e + "" : e, t);
var Wn = T((lt) => {
  h();
  lt.byteLength = Oo;
  lt.toByteArray = Qo;
  lt.fromByteArray = No;
  var le = [], X = [], ko = typeof Uint8Array < "u" ? Uint8Array : Array, qt = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (Ae = 0, qn = qt.length;Ae < qn; ++Ae)
    le[Ae] = qt[Ae], X[qt.charCodeAt(Ae)] = Ae;
  var Ae, qn;
  X[45] = 62;
  X[95] = 63;
  function Nn(r) {
    var e = r.length;
    if (e % 4 > 0)
      throw new Error("Invalid string. Length must be a multiple of 4");
    var t = r.indexOf("=");
    t === -1 && (t = e);
    var n = t === e ? 0 : 4 - t % 4;
    return [t, n];
  }
  a(Nn, "getLens");
  function Oo(r) {
    var e = Nn(r), t = e[0], n = e[1];
    return (t + n) * 3 / 4 - n;
  }
  a(Oo, "byteLength");
  function Uo(r, e, t) {
    return (e + t) * 3 / 4 - t;
  }
  a(Uo, "_byteLength");
  function Qo(r) {
    var e, t = Nn(r), n = t[0], i = t[1], s = new ko(Uo(r, n, i)), o = 0, u = i > 0 ? n - 4 : n, c;
    for (c = 0;c < u; c += 4)
      e = X[r.charCodeAt(c)] << 18 | X[r.charCodeAt(c + 1)] << 12 | X[r.charCodeAt(c + 2)] << 6 | X[r.charCodeAt(c + 3)], s[o++] = e >> 16 & 255, s[o++] = e >> 8 & 255, s[o++] = e & 255;
    return i === 2 && (e = X[r.charCodeAt(c)] << 2 | X[r.charCodeAt(c + 1)] >> 4, s[o++] = e & 255), i === 1 && (e = X[r.charCodeAt(c)] << 10 | X[r.charCodeAt(c + 1)] << 4 | X[r.charCodeAt(c + 2)] >> 2, s[o++] = e >> 8 & 255, s[o++] = e & 255), s;
  }
  a(Qo, "toByteArray");
  function Do(r) {
    return le[r >> 18 & 63] + le[r >> 12 & 63] + le[r >> 6 & 63] + le[r & 63];
  }
  a(Do, "tripletToBase64");
  function qo(r, e, t) {
    for (var n, i = [], s = e;s < t; s += 3)
      n = (r[s] << 16 & 16711680) + (r[s + 1] << 8 & 65280) + (r[s + 2] & 255), i.push(Do(n));
    return i.join("");
  }
  a(qo, "encodeChunk");
  function No(r) {
    for (var e, t = r.length, n = t % 3, i = [], s = 16383, o = 0, u = t - n;o < u; o += s)
      i.push(qo(r, o, o + s > u ? u : o + s));
    return n === 1 ? (e = r[t - 1], i.push(le[e >> 2] + le[e << 4 & 63] + "==")) : n === 2 && (e = (r[t - 2] << 8) + r[t - 1], i.push(le[e >> 10] + le[e >> 4 & 63] + le[e << 2 & 63] + "=")), i.join("");
  }
  a(No, "fromByteArray");
});
var jn = T((Nt) => {
  h();
  Nt.read = function(r, e, t, n, i) {
    var s, o, u = i * 8 - n - 1, c = (1 << u) - 1, l = c >> 1, f = -7, m = t ? i - 1 : 0, g = t ? -1 : 1, w = r[e + m];
    for (m += g, s = w & (1 << -f) - 1, w >>= -f, f += u;f > 0; s = s * 256 + r[e + m], m += g, f -= 8)
      ;
    for (o = s & (1 << -f) - 1, s >>= -f, f += n;f > 0; o = o * 256 + r[e + m], m += g, f -= 8)
      ;
    if (s === 0)
      s = 1 - l;
    else {
      if (s === c)
        return o ? NaN : (w ? -1 : 1) * (1 / 0);
      o = o + Math.pow(2, n), s = s - l;
    }
    return (w ? -1 : 1) * o * Math.pow(2, s - n);
  };
  Nt.write = function(r, e, t, n, i, s) {
    var o, u, c, l = s * 8 - i - 1, f = (1 << l) - 1, m = f >> 1, g = i === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0, w = n ? 0 : s - 1, S = n ? 1 : -1, k = e < 0 || e === 0 && 1 / e < 0 ? 1 : 0;
    for (e = Math.abs(e), isNaN(e) || e === 1 / 0 ? (u = isNaN(e) ? 1 : 0, o = f) : (o = Math.floor(Math.log(e) / Math.LN2), e * (c = Math.pow(2, -o)) < 1 && (o--, c *= 2), o + m >= 1 ? e += g / c : e += g * Math.pow(2, 1 - m), e * c >= 2 && (o++, c /= 2), o + m >= f ? (u = 0, o = f) : o + m >= 1 ? (u = (e * c - 1) * Math.pow(2, i), o = o + m) : (u = e * Math.pow(2, m - 1) * Math.pow(2, i), o = 0));i >= 8; r[t + w] = u & 255, w += S, u /= 256, i -= 8)
      ;
    for (o = o << i | u, l += i;l > 0; r[t + w] = o & 255, w += S, o /= 256, l -= 8)
      ;
    r[t + w - S] |= k * 128;
  };
});
var oi = T((Be) => {
  h();
  var Wt = Wn(), Re = jn(), Hn = typeof Symbol == "function" && typeof Symbol.for == "function" ? Symbol.for("nodejs.util.inspect.custom") : null;
  Be.Buffer = d;
  Be.SlowBuffer = Vo;
  Be.INSPECT_MAX_BYTES = 50;
  var ft = 2147483647;
  Be.kMaxLength = ft;
  d.TYPED_ARRAY_SUPPORT = Wo();
  !d.TYPED_ARRAY_SUPPORT && typeof console < "u" && typeof console.error == "function" && console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support.");
  function Wo() {
    try {
      let r = new Uint8Array(1), e = { foo: a(function() {
        return 42;
      }, "foo") };
      return Object.setPrototypeOf(e, Uint8Array.prototype), Object.setPrototypeOf(r, e), r.foo() === 42;
    } catch {
      return false;
    }
  }
  a(Wo, "typedArraySupport");
  Object.defineProperty(d.prototype, "parent", { enumerable: true, get: a(function() {
    if (d.isBuffer(this))
      return this.buffer;
  }, "get") });
  Object.defineProperty(d.prototype, "offset", { enumerable: true, get: a(function() {
    if (d.isBuffer(this))
      return this.byteOffset;
  }, "get") });
  function de(r) {
    if (r > ft)
      throw new RangeError('The value "' + r + '" is invalid for option "size"');
    let e = new Uint8Array(r);
    return Object.setPrototypeOf(e, d.prototype), e;
  }
  a(de, "createBuffer");
  function d(r, e, t) {
    if (typeof r == "number") {
      if (typeof e == "string")
        throw new TypeError('The "string" argument must be of type string. Received type number');
      return Gt(r);
    }
    return zn(r, e, t);
  }
  a(d, "Buffer");
  d.poolSize = 8192;
  function zn(r, e, t) {
    if (typeof r == "string")
      return Ho(r, e);
    if (ArrayBuffer.isView(r))
      return $o(r);
    if (r == null)
      throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof r);
    if (fe(r, ArrayBuffer) || r && fe(r.buffer, ArrayBuffer) || typeof SharedArrayBuffer < "u" && (fe(r, SharedArrayBuffer) || r && fe(r.buffer, SharedArrayBuffer)))
      return Ht(r, e, t);
    if (typeof r == "number")
      throw new TypeError('The "value" argument must not be of type number. Received type number');
    let n = r.valueOf && r.valueOf();
    if (n != null && n !== r)
      return d.from(n, e, t);
    let i = Go(r);
    if (i)
      return i;
    if (typeof Symbol < "u" && Symbol.toPrimitive != null && typeof r[Symbol.toPrimitive] == "function")
      return d.from(r[Symbol.toPrimitive]("string"), e, t);
    throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof r);
  }
  a(zn, "from");
  d.from = function(r, e, t) {
    return zn(r, e, t);
  };
  Object.setPrototypeOf(d.prototype, Uint8Array.prototype);
  Object.setPrototypeOf(d, Uint8Array);
  function Kn(r) {
    if (typeof r != "number")
      throw new TypeError('"size" argument must be of type number');
    if (r < 0)
      throw new RangeError('The value "' + r + '" is invalid for option "size"');
  }
  a(Kn, "assertSize");
  function jo(r, e, t) {
    return Kn(r), r <= 0 ? de(r) : e !== undefined ? typeof t == "string" ? de(r).fill(e, t) : de(r).fill(e) : de(r);
  }
  a(jo, "alloc");
  d.alloc = function(r, e, t) {
    return jo(r, e, t);
  };
  function Gt(r) {
    return Kn(r), de(r < 0 ? 0 : Vt(r) | 0);
  }
  a(Gt, "allocUnsafe");
  d.allocUnsafe = function(r) {
    return Gt(r);
  };
  d.allocUnsafeSlow = function(r) {
    return Gt(r);
  };
  function Ho(r, e) {
    if ((typeof e != "string" || e === "") && (e = "utf8"), !d.isEncoding(e))
      throw new TypeError("Unknown encoding: " + e);
    let t = Yn(r, e) | 0, n = de(t), i = n.write(r, e);
    return i !== t && (n = n.slice(0, i)), n;
  }
  a(Ho, "fromString");
  function jt(r) {
    let e = r.length < 0 ? 0 : Vt(r.length) | 0, t = de(e);
    for (let n = 0;n < e; n += 1)
      t[n] = r[n] & 255;
    return t;
  }
  a(jt, "fromArrayLike");
  function $o(r) {
    if (fe(r, Uint8Array)) {
      let e = new Uint8Array(r);
      return Ht(e.buffer, e.byteOffset, e.byteLength);
    }
    return jt(r);
  }
  a($o, "fromArrayView");
  function Ht(r, e, t) {
    if (e < 0 || r.byteLength < e)
      throw new RangeError('"offset" is outside of buffer bounds');
    if (r.byteLength < e + (t || 0))
      throw new RangeError('"length" is outside of buffer bounds');
    let n;
    return e === undefined && t === undefined ? n = new Uint8Array(r) : t === undefined ? n = new Uint8Array(r, e) : n = new Uint8Array(r, e, t), Object.setPrototypeOf(n, d.prototype), n;
  }
  a(Ht, "fromArrayBuffer");
  function Go(r) {
    if (d.isBuffer(r)) {
      let e = Vt(r.length) | 0, t = de(e);
      return t.length === 0 || r.copy(t, 0, 0, e), t;
    }
    if (r.length !== undefined)
      return typeof r.length != "number" || Kt(r.length) ? de(0) : jt(r);
    if (r.type === "Buffer" && Array.isArray(r.data))
      return jt(r.data);
  }
  a(Go, "fromObject");
  function Vt(r) {
    if (r >= ft)
      throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + ft.toString(16) + " bytes");
    return r | 0;
  }
  a(Vt, "checked");
  function Vo(r) {
    return +r != r && (r = 0), d.alloc(+r);
  }
  a(Vo, "SlowBuffer");
  d.isBuffer = a(function(e) {
    return e != null && e._isBuffer === true && e !== d.prototype;
  }, "isBuffer");
  d.compare = a(function(e, t) {
    if (fe(e, Uint8Array) && (e = d.from(e, e.offset, e.byteLength)), fe(t, Uint8Array) && (t = d.from(t, t.offset, t.byteLength)), !d.isBuffer(e) || !d.isBuffer(t))
      throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');
    if (e === t)
      return 0;
    let n = e.length, i = t.length;
    for (let s = 0, o = Math.min(n, i);s < o; ++s)
      if (e[s] !== t[s]) {
        n = e[s], i = t[s];
        break;
      }
    return n < i ? -1 : i < n ? 1 : 0;
  }, "compare");
  d.isEncoding = a(function(e) {
    switch (String(e).toLowerCase()) {
      case "hex":
      case "utf8":
      case "utf-8":
      case "ascii":
      case "latin1":
      case "binary":
      case "base64":
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return true;
      default:
        return false;
    }
  }, "isEncoding");
  d.concat = a(function(e, t) {
    if (!Array.isArray(e))
      throw new TypeError('"list" argument must be an Array of Buffers');
    if (e.length === 0)
      return d.alloc(0);
    let n;
    if (t === undefined)
      for (t = 0, n = 0;n < e.length; ++n)
        t += e[n].length;
    let i = d.allocUnsafe(t), s = 0;
    for (n = 0;n < e.length; ++n) {
      let o = e[n];
      if (fe(o, Uint8Array))
        s + o.length > i.length ? (d.isBuffer(o) || (o = d.from(o)), o.copy(i, s)) : Uint8Array.prototype.set.call(i, o, s);
      else if (d.isBuffer(o))
        o.copy(i, s);
      else
        throw new TypeError('"list" argument must be an Array of Buffers');
      s += o.length;
    }
    return i;
  }, "concat");
  function Yn(r, e) {
    if (d.isBuffer(r))
      return r.length;
    if (ArrayBuffer.isView(r) || fe(r, ArrayBuffer))
      return r.byteLength;
    if (typeof r != "string")
      throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof r);
    let t = r.length, n = arguments.length > 2 && arguments[2] === true;
    if (!n && t === 0)
      return 0;
    let i = false;
    for (;; )
      switch (e) {
        case "ascii":
        case "latin1":
        case "binary":
          return t;
        case "utf8":
        case "utf-8":
          return $t(r).length;
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return t * 2;
        case "hex":
          return t >>> 1;
        case "base64":
          return si(r).length;
        default:
          if (i)
            return n ? -1 : $t(r).length;
          e = ("" + e).toLowerCase(), i = true;
      }
  }
  a(Yn, "byteLength");
  d.byteLength = Yn;
  function zo(r, e, t) {
    let n = false;
    if ((e === undefined || e < 0) && (e = 0), e > this.length || ((t === undefined || t > this.length) && (t = this.length), t <= 0) || (t >>>= 0, e >>>= 0, t <= e))
      return "";
    for (r || (r = "utf8");; )
      switch (r) {
        case "hex":
          return ia(this, e, t);
        case "utf8":
        case "utf-8":
          return Jn(this, e, t);
        case "ascii":
          return ra(this, e, t);
        case "latin1":
        case "binary":
          return na(this, e, t);
        case "base64":
          return ea(this, e, t);
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return sa(this, e, t);
        default:
          if (n)
            throw new TypeError("Unknown encoding: " + r);
          r = (r + "").toLowerCase(), n = true;
      }
  }
  a(zo, "slowToString");
  d.prototype._isBuffer = true;
  function Ce(r, e, t) {
    let n = r[e];
    r[e] = r[t], r[t] = n;
  }
  a(Ce, "swap");
  d.prototype.swap16 = a(function() {
    let e = this.length;
    if (e % 2 !== 0)
      throw new RangeError("Buffer size must be a multiple of 16-bits");
    for (let t = 0;t < e; t += 2)
      Ce(this, t, t + 1);
    return this;
  }, "swap16");
  d.prototype.swap32 = a(function() {
    let e = this.length;
    if (e % 4 !== 0)
      throw new RangeError("Buffer size must be a multiple of 32-bits");
    for (let t = 0;t < e; t += 4)
      Ce(this, t, t + 3), Ce(this, t + 1, t + 2);
    return this;
  }, "swap32");
  d.prototype.swap64 = a(function() {
    let e = this.length;
    if (e % 8 !== 0)
      throw new RangeError("Buffer size must be a multiple of 64-bits");
    for (let t = 0;t < e; t += 8)
      Ce(this, t, t + 7), Ce(this, t + 1, t + 6), Ce(this, t + 2, t + 5), Ce(this, t + 3, t + 4);
    return this;
  }, "swap64");
  d.prototype.toString = a(function() {
    let e = this.length;
    return e === 0 ? "" : arguments.length === 0 ? Jn(this, 0, e) : zo.apply(this, arguments);
  }, "toString");
  d.prototype.toLocaleString = d.prototype.toString;
  d.prototype.equals = a(function(e) {
    if (!d.isBuffer(e))
      throw new TypeError("Argument must be a Buffer");
    return this === e ? true : d.compare(this, e) === 0;
  }, "equals");
  d.prototype.inspect = a(function() {
    let e = "", t = Be.INSPECT_MAX_BYTES;
    return e = this.toString("hex", 0, t).replace(/(.{2})/g, "$1 ").trim(), this.length > t && (e += " ... "), "<Buffer " + e + ">";
  }, "inspect");
  Hn && (d.prototype[Hn] = d.prototype.inspect);
  d.prototype.compare = a(function(e, t, n, i, s) {
    if (fe(e, Uint8Array) && (e = d.from(e, e.offset, e.byteLength)), !d.isBuffer(e))
      throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof e);
    if (t === undefined && (t = 0), n === undefined && (n = e ? e.length : 0), i === undefined && (i = 0), s === undefined && (s = this.length), t < 0 || n > e.length || i < 0 || s > this.length)
      throw new RangeError("out of range index");
    if (i >= s && t >= n)
      return 0;
    if (i >= s)
      return -1;
    if (t >= n)
      return 1;
    if (t >>>= 0, n >>>= 0, i >>>= 0, s >>>= 0, this === e)
      return 0;
    let o = s - i, u = n - t, c = Math.min(o, u), l = this.slice(i, s), f = e.slice(t, n);
    for (let m = 0;m < c; ++m)
      if (l[m] !== f[m]) {
        o = l[m], u = f[m];
        break;
      }
    return o < u ? -1 : u < o ? 1 : 0;
  }, "compare");
  function Zn(r, e, t, n, i) {
    if (r.length === 0)
      return -1;
    if (typeof t == "string" ? (n = t, t = 0) : t > 2147483647 ? t = 2147483647 : t < -2147483648 && (t = -2147483648), t = +t, Kt(t) && (t = i ? 0 : r.length - 1), t < 0 && (t = r.length + t), t >= r.length) {
      if (i)
        return -1;
      t = r.length - 1;
    } else if (t < 0)
      if (i)
        t = 0;
      else
        return -1;
    if (typeof e == "string" && (e = d.from(e, n)), d.isBuffer(e))
      return e.length === 0 ? -1 : $n(r, e, t, n, i);
    if (typeof e == "number")
      return e = e & 255, typeof Uint8Array.prototype.indexOf == "function" ? i ? Uint8Array.prototype.indexOf.call(r, e, t) : Uint8Array.prototype.lastIndexOf.call(r, e, t) : $n(r, [e], t, n, i);
    throw new TypeError("val must be string, number or Buffer");
  }
  a(Zn, "bidirectionalIndexOf");
  function $n(r, e, t, n, i) {
    let s = 1, o = r.length, u = e.length;
    if (n !== undefined && (n = String(n).toLowerCase(), n === "ucs2" || n === "ucs-2" || n === "utf16le" || n === "utf-16le")) {
      if (r.length < 2 || e.length < 2)
        return -1;
      s = 2, o /= 2, u /= 2, t /= 2;
    }
    function c(f, m) {
      return s === 1 ? f[m] : f.readUInt16BE(m * s);
    }
    a(c, "read");
    let l;
    if (i) {
      let f = -1;
      for (l = t;l < o; l++)
        if (c(r, l) === c(e, f === -1 ? 0 : l - f)) {
          if (f === -1 && (f = l), l - f + 1 === u)
            return f * s;
        } else
          f !== -1 && (l -= l - f), f = -1;
    } else
      for (t + u > o && (t = o - u), l = t;l >= 0; l--) {
        let f = true;
        for (let m = 0;m < u; m++)
          if (c(r, l + m) !== c(e, m)) {
            f = false;
            break;
          }
        if (f)
          return l;
      }
    return -1;
  }
  a($n, "arrayIndexOf");
  d.prototype.includes = a(function(e, t, n) {
    return this.indexOf(e, t, n) !== -1;
  }, "includes");
  d.prototype.indexOf = a(function(e, t, n) {
    return Zn(this, e, t, n, true);
  }, "indexOf");
  d.prototype.lastIndexOf = a(function(e, t, n) {
    return Zn(this, e, t, n, false);
  }, "lastIndexOf");
  function Ko(r, e, t, n) {
    t = Number(t) || 0;
    let i = r.length - t;
    n ? (n = Number(n), n > i && (n = i)) : n = i;
    let s = e.length;
    n > s / 2 && (n = s / 2);
    let o;
    for (o = 0;o < n; ++o) {
      let u = parseInt(e.substr(o * 2, 2), 16);
      if (Kt(u))
        return o;
      r[t + o] = u;
    }
    return o;
  }
  a(Ko, "hexWrite");
  function Yo(r, e, t, n) {
    return ht($t(e, r.length - t), r, t, n);
  }
  a(Yo, "utf8Write");
  function Zo(r, e, t, n) {
    return ht(ca(e), r, t, n);
  }
  a(Zo, "asciiWrite");
  function Jo(r, e, t, n) {
    return ht(si(e), r, t, n);
  }
  a(Jo, "base64Write");
  function Xo(r, e, t, n) {
    return ht(la(e, r.length - t), r, t, n);
  }
  a(Xo, "ucs2Write");
  d.prototype.write = a(function(e, t, n, i) {
    if (t === undefined)
      i = "utf8", n = this.length, t = 0;
    else if (n === undefined && typeof t == "string")
      i = t, n = this.length, t = 0;
    else if (isFinite(t))
      t = t >>> 0, isFinite(n) ? (n = n >>> 0, i === undefined && (i = "utf8")) : (i = n, n = undefined);
    else
      throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
    let s = this.length - t;
    if ((n === undefined || n > s) && (n = s), e.length > 0 && (n < 0 || t < 0) || t > this.length)
      throw new RangeError("Attempt to write outside buffer bounds");
    i || (i = "utf8");
    let o = false;
    for (;; )
      switch (i) {
        case "hex":
          return Ko(this, e, t, n);
        case "utf8":
        case "utf-8":
          return Yo(this, e, t, n);
        case "ascii":
        case "latin1":
        case "binary":
          return Zo(this, e, t, n);
        case "base64":
          return Jo(this, e, t, n);
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return Xo(this, e, t, n);
        default:
          if (o)
            throw new TypeError("Unknown encoding: " + i);
          i = ("" + i).toLowerCase(), o = true;
      }
  }, "write");
  d.prototype.toJSON = a(function() {
    return { type: "Buffer", data: Array.prototype.slice.call(this._arr || this, 0) };
  }, "toJSON");
  function ea(r, e, t) {
    return e === 0 && t === r.length ? Wt.fromByteArray(r) : Wt.fromByteArray(r.slice(e, t));
  }
  a(ea, "base64Slice");
  function Jn(r, e, t) {
    t = Math.min(r.length, t);
    let n = [], i = e;
    for (;i < t; ) {
      let s = r[i], o = null, u = s > 239 ? 4 : s > 223 ? 3 : s > 191 ? 2 : 1;
      if (i + u <= t) {
        let c, l, f, m;
        switch (u) {
          case 1:
            s < 128 && (o = s);
            break;
          case 2:
            c = r[i + 1], (c & 192) === 128 && (m = (s & 31) << 6 | c & 63, m > 127 && (o = m));
            break;
          case 3:
            c = r[i + 1], l = r[i + 2], (c & 192) === 128 && (l & 192) === 128 && (m = (s & 15) << 12 | (c & 63) << 6 | l & 63, m > 2047 && (m < 55296 || m > 57343) && (o = m));
            break;
          case 4:
            c = r[i + 1], l = r[i + 2], f = r[i + 3], (c & 192) === 128 && (l & 192) === 128 && (f & 192) === 128 && (m = (s & 15) << 18 | (c & 63) << 12 | (l & 63) << 6 | f & 63, m > 65535 && m < 1114112 && (o = m));
        }
      }
      o === null ? (o = 65533, u = 1) : o > 65535 && (o -= 65536, n.push(o >>> 10 & 1023 | 55296), o = 56320 | o & 1023), n.push(o), i += u;
    }
    return ta(n);
  }
  a(Jn, "utf8Slice");
  var Gn = 4096;
  function ta(r) {
    let e = r.length;
    if (e <= Gn)
      return String.fromCharCode.apply(String, r);
    let t = "", n = 0;
    for (;n < e; )
      t += String.fromCharCode.apply(String, r.slice(n, n += Gn));
    return t;
  }
  a(ta, "decodeCodePointsArray");
  function ra(r, e, t) {
    let n = "";
    t = Math.min(r.length, t);
    for (let i = e;i < t; ++i)
      n += String.fromCharCode(r[i] & 127);
    return n;
  }
  a(ra, "asciiSlice");
  function na(r, e, t) {
    let n = "";
    t = Math.min(r.length, t);
    for (let i = e;i < t; ++i)
      n += String.fromCharCode(r[i]);
    return n;
  }
  a(na, "latin1Slice");
  function ia(r, e, t) {
    let n = r.length;
    (!e || e < 0) && (e = 0), (!t || t < 0 || t > n) && (t = n);
    let i = "";
    for (let s = e;s < t; ++s)
      i += fa[r[s]];
    return i;
  }
  a(ia, "hexSlice");
  function sa(r, e, t) {
    let n = r.slice(e, t), i = "";
    for (let s = 0;s < n.length - 1; s += 2)
      i += String.fromCharCode(n[s] + n[s + 1] * 256);
    return i;
  }
  a(sa, "utf16leSlice");
  d.prototype.slice = a(function(e, t) {
    let n = this.length;
    e = ~~e, t = t === undefined ? n : ~~t, e < 0 ? (e += n, e < 0 && (e = 0)) : e > n && (e = n), t < 0 ? (t += n, t < 0 && (t = 0)) : t > n && (t = n), t < e && (t = e);
    let i = this.subarray(e, t);
    return Object.setPrototypeOf(i, d.prototype), i;
  }, "slice");
  function U(r, e, t) {
    if (r % 1 !== 0 || r < 0)
      throw new RangeError("offset is not uint");
    if (r + e > t)
      throw new RangeError("Trying to access beyond buffer length");
  }
  a(U, "checkOffset");
  d.prototype.readUintLE = d.prototype.readUIntLE = a(function(e, t, n) {
    e = e >>> 0, t = t >>> 0, n || U(e, t, this.length);
    let i = this[e], s = 1, o = 0;
    for (;++o < t && (s *= 256); )
      i += this[e + o] * s;
    return i;
  }, "readUIntLE");
  d.prototype.readUintBE = d.prototype.readUIntBE = a(function(e, t, n) {
    e = e >>> 0, t = t >>> 0, n || U(e, t, this.length);
    let i = this[e + --t], s = 1;
    for (;t > 0 && (s *= 256); )
      i += this[e + --t] * s;
    return i;
  }, "readUIntBE");
  d.prototype.readUint8 = d.prototype.readUInt8 = a(function(e, t) {
    return e = e >>> 0, t || U(e, 1, this.length), this[e];
  }, "readUInt8");
  d.prototype.readUint16LE = d.prototype.readUInt16LE = a(function(e, t) {
    return e = e >>> 0, t || U(e, 2, this.length), this[e] | this[e + 1] << 8;
  }, "readUInt16LE");
  d.prototype.readUint16BE = d.prototype.readUInt16BE = a(function(e, t) {
    return e = e >>> 0, t || U(e, 2, this.length), this[e] << 8 | this[e + 1];
  }, "readUInt16BE");
  d.prototype.readUint32LE = d.prototype.readUInt32LE = a(function(e, t) {
    return e = e >>> 0, t || U(e, 4, this.length), (this[e] | this[e + 1] << 8 | this[e + 2] << 16) + this[e + 3] * 16777216;
  }, "readUInt32LE");
  d.prototype.readUint32BE = d.prototype.readUInt32BE = a(function(e, t) {
    return e = e >>> 0, t || U(e, 4, this.length), this[e] * 16777216 + (this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3]);
  }, "readUInt32BE");
  d.prototype.readBigUInt64LE = be(a(function(e) {
    e = e >>> 0, Le(e, "offset");
    let t = this[e], n = this[e + 7];
    (t === undefined || n === undefined) && We(e, this.length - 8);
    let i = t + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + this[++e] * 2 ** 24, s = this[++e] + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + n * 2 ** 24;
    return BigInt(i) + (BigInt(s) << BigInt(32));
  }, "readBigUInt64LE"));
  d.prototype.readBigUInt64BE = be(a(function(e) {
    e = e >>> 0, Le(e, "offset");
    let t = this[e], n = this[e + 7];
    (t === undefined || n === undefined) && We(e, this.length - 8);
    let i = t * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + this[++e], s = this[++e] * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + n;
    return (BigInt(i) << BigInt(32)) + BigInt(s);
  }, "readBigUInt64BE"));
  d.prototype.readIntLE = a(function(e, t, n) {
    e = e >>> 0, t = t >>> 0, n || U(e, t, this.length);
    let i = this[e], s = 1, o = 0;
    for (;++o < t && (s *= 256); )
      i += this[e + o] * s;
    return s *= 128, i >= s && (i -= Math.pow(2, 8 * t)), i;
  }, "readIntLE");
  d.prototype.readIntBE = a(function(e, t, n) {
    e = e >>> 0, t = t >>> 0, n || U(e, t, this.length);
    let i = t, s = 1, o = this[e + --i];
    for (;i > 0 && (s *= 256); )
      o += this[e + --i] * s;
    return s *= 128, o >= s && (o -= Math.pow(2, 8 * t)), o;
  }, "readIntBE");
  d.prototype.readInt8 = a(function(e, t) {
    return e = e >>> 0, t || U(e, 1, this.length), this[e] & 128 ? (255 - this[e] + 1) * -1 : this[e];
  }, "readInt8");
  d.prototype.readInt16LE = a(function(e, t) {
    e = e >>> 0, t || U(e, 2, this.length);
    let n = this[e] | this[e + 1] << 8;
    return n & 32768 ? n | 4294901760 : n;
  }, "readInt16LE");
  d.prototype.readInt16BE = a(function(e, t) {
    e = e >>> 0, t || U(e, 2, this.length);
    let n = this[e + 1] | this[e] << 8;
    return n & 32768 ? n | 4294901760 : n;
  }, "readInt16BE");
  d.prototype.readInt32LE = a(function(e, t) {
    return e = e >>> 0, t || U(e, 4, this.length), this[e] | this[e + 1] << 8 | this[e + 2] << 16 | this[e + 3] << 24;
  }, "readInt32LE");
  d.prototype.readInt32BE = a(function(e, t) {
    return e = e >>> 0, t || U(e, 4, this.length), this[e] << 24 | this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3];
  }, "readInt32BE");
  d.prototype.readBigInt64LE = be(a(function(e) {
    e = e >>> 0, Le(e, "offset");
    let t = this[e], n = this[e + 7];
    (t === undefined || n === undefined) && We(e, this.length - 8);
    let i = this[e + 4] + this[e + 5] * 2 ** 8 + this[e + 6] * 2 ** 16 + (n << 24);
    return (BigInt(i) << BigInt(32)) + BigInt(t + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + this[++e] * 2 ** 24);
  }, "readBigInt64LE"));
  d.prototype.readBigInt64BE = be(a(function(e) {
    e = e >>> 0, Le(e, "offset");
    let t = this[e], n = this[e + 7];
    (t === undefined || n === undefined) && We(e, this.length - 8);
    let i = (t << 24) + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + this[++e];
    return (BigInt(i) << BigInt(32)) + BigInt(this[++e] * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + n);
  }, "readBigInt64BE"));
  d.prototype.readFloatLE = a(function(e, t) {
    return e = e >>> 0, t || U(e, 4, this.length), Re.read(this, e, true, 23, 4);
  }, "readFloatLE");
  d.prototype.readFloatBE = a(function(e, t) {
    return e = e >>> 0, t || U(e, 4, this.length), Re.read(this, e, false, 23, 4);
  }, "readFloatBE");
  d.prototype.readDoubleLE = a(function(e, t) {
    return e = e >>> 0, t || U(e, 8, this.length), Re.read(this, e, true, 52, 8);
  }, "readDoubleLE");
  d.prototype.readDoubleBE = a(function(e, t) {
    return e = e >>> 0, t || U(e, 8, this.length), Re.read(this, e, false, 52, 8);
  }, "readDoubleBE");
  function z(r, e, t, n, i, s) {
    if (!d.isBuffer(r))
      throw new TypeError('"buffer" argument must be a Buffer instance');
    if (e > i || e < s)
      throw new RangeError('"value" argument is out of bounds');
    if (t + n > r.length)
      throw new RangeError("Index out of range");
  }
  a(z, "checkInt");
  d.prototype.writeUintLE = d.prototype.writeUIntLE = a(function(e, t, n, i) {
    if (e = +e, t = t >>> 0, n = n >>> 0, !i) {
      let u = Math.pow(2, 8 * n) - 1;
      z(this, e, t, n, u, 0);
    }
    let s = 1, o = 0;
    for (this[t] = e & 255;++o < n && (s *= 256); )
      this[t + o] = e / s & 255;
    return t + n;
  }, "writeUIntLE");
  d.prototype.writeUintBE = d.prototype.writeUIntBE = a(function(e, t, n, i) {
    if (e = +e, t = t >>> 0, n = n >>> 0, !i) {
      let u = Math.pow(2, 8 * n) - 1;
      z(this, e, t, n, u, 0);
    }
    let s = n - 1, o = 1;
    for (this[t + s] = e & 255;--s >= 0 && (o *= 256); )
      this[t + s] = e / o & 255;
    return t + n;
  }, "writeUIntBE");
  d.prototype.writeUint8 = d.prototype.writeUInt8 = a(function(e, t, n) {
    return e = +e, t = t >>> 0, n || z(this, e, t, 1, 255, 0), this[t] = e & 255, t + 1;
  }, "writeUInt8");
  d.prototype.writeUint16LE = d.prototype.writeUInt16LE = a(function(e, t, n) {
    return e = +e, t = t >>> 0, n || z(this, e, t, 2, 65535, 0), this[t] = e & 255, this[t + 1] = e >>> 8, t + 2;
  }, "writeUInt16LE");
  d.prototype.writeUint16BE = d.prototype.writeUInt16BE = a(function(e, t, n) {
    return e = +e, t = t >>> 0, n || z(this, e, t, 2, 65535, 0), this[t] = e >>> 8, this[t + 1] = e & 255, t + 2;
  }, "writeUInt16BE");
  d.prototype.writeUint32LE = d.prototype.writeUInt32LE = a(function(e, t, n) {
    return e = +e, t = t >>> 0, n || z(this, e, t, 4, 4294967295, 0), this[t + 3] = e >>> 24, this[t + 2] = e >>> 16, this[t + 1] = e >>> 8, this[t] = e & 255, t + 4;
  }, "writeUInt32LE");
  d.prototype.writeUint32BE = d.prototype.writeUInt32BE = a(function(e, t, n) {
    return e = +e, t = t >>> 0, n || z(this, e, t, 4, 4294967295, 0), this[t] = e >>> 24, this[t + 1] = e >>> 16, this[t + 2] = e >>> 8, this[t + 3] = e & 255, t + 4;
  }, "writeUInt32BE");
  function Xn(r, e, t, n, i) {
    ii(e, n, i, r, t, 7);
    let s = Number(e & BigInt(4294967295));
    r[t++] = s, s = s >> 8, r[t++] = s, s = s >> 8, r[t++] = s, s = s >> 8, r[t++] = s;
    let o = Number(e >> BigInt(32) & BigInt(4294967295));
    return r[t++] = o, o = o >> 8, r[t++] = o, o = o >> 8, r[t++] = o, o = o >> 8, r[t++] = o, t;
  }
  a(Xn, "wrtBigUInt64LE");
  function ei(r, e, t, n, i) {
    ii(e, n, i, r, t, 7);
    let s = Number(e & BigInt(4294967295));
    r[t + 7] = s, s = s >> 8, r[t + 6] = s, s = s >> 8, r[t + 5] = s, s = s >> 8, r[t + 4] = s;
    let o = Number(e >> BigInt(32) & BigInt(4294967295));
    return r[t + 3] = o, o = o >> 8, r[t + 2] = o, o = o >> 8, r[t + 1] = o, o = o >> 8, r[t] = o, t + 8;
  }
  a(ei, "wrtBigUInt64BE");
  d.prototype.writeBigUInt64LE = be(a(function(e, t = 0) {
    return Xn(this, e, t, BigInt(0), BigInt("0xffffffffffffffff"));
  }, "writeBigUInt64LE"));
  d.prototype.writeBigUInt64BE = be(a(function(e, t = 0) {
    return ei(this, e, t, BigInt(0), BigInt("0xffffffffffffffff"));
  }, "writeBigUInt64BE"));
  d.prototype.writeIntLE = a(function(e, t, n, i) {
    if (e = +e, t = t >>> 0, !i) {
      let c = Math.pow(2, 8 * n - 1);
      z(this, e, t, n, c - 1, -c);
    }
    let s = 0, o = 1, u = 0;
    for (this[t] = e & 255;++s < n && (o *= 256); )
      e < 0 && u === 0 && this[t + s - 1] !== 0 && (u = 1), this[t + s] = (e / o >> 0) - u & 255;
    return t + n;
  }, "writeIntLE");
  d.prototype.writeIntBE = a(function(e, t, n, i) {
    if (e = +e, t = t >>> 0, !i) {
      let c = Math.pow(2, 8 * n - 1);
      z(this, e, t, n, c - 1, -c);
    }
    let s = n - 1, o = 1, u = 0;
    for (this[t + s] = e & 255;--s >= 0 && (o *= 256); )
      e < 0 && u === 0 && this[t + s + 1] !== 0 && (u = 1), this[t + s] = (e / o >> 0) - u & 255;
    return t + n;
  }, "writeIntBE");
  d.prototype.writeInt8 = a(function(e, t, n) {
    return e = +e, t = t >>> 0, n || z(this, e, t, 1, 127, -128), e < 0 && (e = 255 + e + 1), this[t] = e & 255, t + 1;
  }, "writeInt8");
  d.prototype.writeInt16LE = a(function(e, t, n) {
    return e = +e, t = t >>> 0, n || z(this, e, t, 2, 32767, -32768), this[t] = e & 255, this[t + 1] = e >>> 8, t + 2;
  }, "writeInt16LE");
  d.prototype.writeInt16BE = a(function(e, t, n) {
    return e = +e, t = t >>> 0, n || z(this, e, t, 2, 32767, -32768), this[t] = e >>> 8, this[t + 1] = e & 255, t + 2;
  }, "writeInt16BE");
  d.prototype.writeInt32LE = a(function(e, t, n) {
    return e = +e, t = t >>> 0, n || z(this, e, t, 4, 2147483647, -2147483648), this[t] = e & 255, this[t + 1] = e >>> 8, this[t + 2] = e >>> 16, this[t + 3] = e >>> 24, t + 4;
  }, "writeInt32LE");
  d.prototype.writeInt32BE = a(function(e, t, n) {
    return e = +e, t = t >>> 0, n || z(this, e, t, 4, 2147483647, -2147483648), e < 0 && (e = 4294967295 + e + 1), this[t] = e >>> 24, this[t + 1] = e >>> 16, this[t + 2] = e >>> 8, this[t + 3] = e & 255, t + 4;
  }, "writeInt32BE");
  d.prototype.writeBigInt64LE = be(a(function(e, t = 0) {
    return Xn(this, e, t, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
  }, "writeBigInt64LE"));
  d.prototype.writeBigInt64BE = be(a(function(e, t = 0) {
    return ei(this, e, t, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
  }, "writeBigInt64BE"));
  function ti(r, e, t, n, i, s) {
    if (t + n > r.length)
      throw new RangeError("Index out of range");
    if (t < 0)
      throw new RangeError("Index out of range");
  }
  a(ti, "checkIEEE754");
  function ri(r, e, t, n, i) {
    return e = +e, t = t >>> 0, i || ti(r, e, t, 4, 340282346638528860000000000000000000000, -340282346638528860000000000000000000000), Re.write(r, e, t, n, 23, 4), t + 4;
  }
  a(ri, "writeFloat");
  d.prototype.writeFloatLE = a(function(e, t, n) {
    return ri(this, e, t, true, n);
  }, "writeFloatLE");
  d.prototype.writeFloatBE = a(function(e, t, n) {
    return ri(this, e, t, false, n);
  }, "writeFloatBE");
  function ni(r, e, t, n, i) {
    return e = +e, t = t >>> 0, i || ti(r, e, t, 8, 179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000, -179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000), Re.write(r, e, t, n, 52, 8), t + 8;
  }
  a(ni, "writeDouble");
  d.prototype.writeDoubleLE = a(function(e, t, n) {
    return ni(this, e, t, true, n);
  }, "writeDoubleLE");
  d.prototype.writeDoubleBE = a(function(e, t, n) {
    return ni(this, e, t, false, n);
  }, "writeDoubleBE");
  d.prototype.copy = a(function(e, t, n, i) {
    if (!d.isBuffer(e))
      throw new TypeError("argument should be a Buffer");
    if (n || (n = 0), !i && i !== 0 && (i = this.length), t >= e.length && (t = e.length), t || (t = 0), i > 0 && i < n && (i = n), i === n || e.length === 0 || this.length === 0)
      return 0;
    if (t < 0)
      throw new RangeError("targetStart out of bounds");
    if (n < 0 || n >= this.length)
      throw new RangeError("Index out of range");
    if (i < 0)
      throw new RangeError("sourceEnd out of bounds");
    i > this.length && (i = this.length), e.length - t < i - n && (i = e.length - t + n);
    let s = i - n;
    return this === e && typeof Uint8Array.prototype.copyWithin == "function" ? this.copyWithin(t, n, i) : Uint8Array.prototype.set.call(e, this.subarray(n, i), t), s;
  }, "copy");
  d.prototype.fill = a(function(e, t, n, i) {
    if (typeof e == "string") {
      if (typeof t == "string" ? (i = t, t = 0, n = this.length) : typeof n == "string" && (i = n, n = this.length), i !== undefined && typeof i != "string")
        throw new TypeError("encoding must be a string");
      if (typeof i == "string" && !d.isEncoding(i))
        throw new TypeError("Unknown encoding: " + i);
      if (e.length === 1) {
        let o = e.charCodeAt(0);
        (i === "utf8" && o < 128 || i === "latin1") && (e = o);
      }
    } else
      typeof e == "number" ? e = e & 255 : typeof e == "boolean" && (e = Number(e));
    if (t < 0 || this.length < t || this.length < n)
      throw new RangeError("Out of range index");
    if (n <= t)
      return this;
    t = t >>> 0, n = n === undefined ? this.length : n >>> 0, e || (e = 0);
    let s;
    if (typeof e == "number")
      for (s = t;s < n; ++s)
        this[s] = e;
    else {
      let o = d.isBuffer(e) ? e : d.from(e, i), u = o.length;
      if (u === 0)
        throw new TypeError('The value "' + e + '" is invalid for argument "value"');
      for (s = 0;s < n - t; ++s)
        this[s + t] = o[s % u];
    }
    return this;
  }, "fill");
  var Pe = {};
  function zt(r, e, t) {
    var n;
    Pe[r] = (n = class extends t {
      constructor() {
        super(), Object.defineProperty(this, "message", { value: e.apply(this, arguments), writable: true, configurable: true }), this.name = `${this.name} [${r}]`, this.stack, delete this.name;
      }
      get code() {
        return r;
      }
      set code(s) {
        Object.defineProperty(this, "code", { configurable: true, enumerable: true, value: s, writable: true });
      }
      toString() {
        return `${this.name} [${r}]: ${this.message}`;
      }
    }, a(n, "NodeError"), n);
  }
  a(zt, "E");
  zt("ERR_BUFFER_OUT_OF_BOUNDS", function(r) {
    return r ? `${r} is outside of buffer bounds` : "Attempt to access memory outside buffer bounds";
  }, RangeError);
  zt("ERR_INVALID_ARG_TYPE", function(r, e) {
    return `The "${r}" argument must be of type number. Received type ${typeof e}`;
  }, TypeError);
  zt("ERR_OUT_OF_RANGE", function(r, e, t) {
    let n = `The value of "${r}" is out of range.`, i = t;
    return Number.isInteger(t) && Math.abs(t) > 2 ** 32 ? i = Vn(String(t)) : typeof t == "bigint" && (i = String(t), (t > BigInt(2) ** BigInt(32) || t < -(BigInt(2) ** BigInt(32))) && (i = Vn(i)), i += "n"), n += ` It must be ${e}. Received ${i}`, n;
  }, RangeError);
  function Vn(r) {
    let e = "", t = r.length, n = r[0] === "-" ? 1 : 0;
    for (;t >= n + 4; t -= 3)
      e = `_${r.slice(t - 3, t)}${e}`;
    return `${r.slice(0, t)}${e}`;
  }
  a(Vn, "addNumericalSeparator");
  function oa(r, e, t) {
    Le(e, "offset"), (r[e] === undefined || r[e + t] === undefined) && We(e, r.length - (t + 1));
  }
  a(oa, "checkBounds");
  function ii(r, e, t, n, i, s) {
    if (r > t || r < e) {
      let o = typeof e == "bigint" ? "n" : "", u;
      throw s > 3 ? e === 0 || e === BigInt(0) ? u = `>= 0${o} and < 2${o} ** ${(s + 1) * 8}${o}` : u = `>= -(2${o} ** ${(s + 1) * 8 - 1}${o}) and < 2 ** ${(s + 1) * 8 - 1}${o}` : u = `>= ${e}${o} and <= ${t}${o}`, new Pe.ERR_OUT_OF_RANGE("value", u, r);
    }
    oa(n, i, s);
  }
  a(ii, "checkIntBI");
  function Le(r, e) {
    if (typeof r != "number")
      throw new Pe.ERR_INVALID_ARG_TYPE(e, "number", r);
  }
  a(Le, "validateNumber");
  function We(r, e, t) {
    throw Math.floor(r) !== r ? (Le(r, t), new Pe.ERR_OUT_OF_RANGE(t || "offset", "an integer", r)) : e < 0 ? new Pe.ERR_BUFFER_OUT_OF_BOUNDS : new Pe.ERR_OUT_OF_RANGE(t || "offset", `>= ${t ? 1 : 0} and <= ${e}`, r);
  }
  a(We, "boundsError");
  var aa = /[^+/0-9A-Za-z-_]/g;
  function ua(r) {
    if (r = r.split("=")[0], r = r.trim().replace(aa, ""), r.length < 2)
      return "";
    for (;r.length % 4 !== 0; )
      r = r + "=";
    return r;
  }
  a(ua, "base64clean");
  function $t(r, e) {
    e = e || 1 / 0;
    let t, n = r.length, i = null, s = [];
    for (let o = 0;o < n; ++o) {
      if (t = r.charCodeAt(o), t > 55295 && t < 57344) {
        if (!i) {
          if (t > 56319) {
            (e -= 3) > -1 && s.push(239, 191, 189);
            continue;
          } else if (o + 1 === n) {
            (e -= 3) > -1 && s.push(239, 191, 189);
            continue;
          }
          i = t;
          continue;
        }
        if (t < 56320) {
          (e -= 3) > -1 && s.push(239, 191, 189), i = t;
          continue;
        }
        t = (i - 55296 << 10 | t - 56320) + 65536;
      } else
        i && (e -= 3) > -1 && s.push(239, 191, 189);
      if (i = null, t < 128) {
        if ((e -= 1) < 0)
          break;
        s.push(t);
      } else if (t < 2048) {
        if ((e -= 2) < 0)
          break;
        s.push(t >> 6 | 192, t & 63 | 128);
      } else if (t < 65536) {
        if ((e -= 3) < 0)
          break;
        s.push(t >> 12 | 224, t >> 6 & 63 | 128, t & 63 | 128);
      } else if (t < 1114112) {
        if ((e -= 4) < 0)
          break;
        s.push(t >> 18 | 240, t >> 12 & 63 | 128, t >> 6 & 63 | 128, t & 63 | 128);
      } else
        throw new Error("Invalid code point");
    }
    return s;
  }
  a($t, "utf8ToBytes");
  function ca(r) {
    let e = [];
    for (let t = 0;t < r.length; ++t)
      e.push(r.charCodeAt(t) & 255);
    return e;
  }
  a(ca, "asciiToBytes");
  function la(r, e) {
    let t, n, i, s = [];
    for (let o = 0;o < r.length && !((e -= 2) < 0); ++o)
      t = r.charCodeAt(o), n = t >> 8, i = t % 256, s.push(i), s.push(n);
    return s;
  }
  a(la, "utf16leToBytes");
  function si(r) {
    return Wt.toByteArray(ua(r));
  }
  a(si, "base64ToBytes");
  function ht(r, e, t, n) {
    let i;
    for (i = 0;i < n && !(i + t >= e.length || i >= r.length); ++i)
      e[i + t] = r[i];
    return i;
  }
  a(ht, "blitBuffer");
  function fe(r, e) {
    return r instanceof e || r != null && r.constructor != null && r.constructor.name != null && r.constructor.name === e.name;
  }
  a(fe, "isInstance");
  function Kt(r) {
    return r !== r;
  }
  a(Kt, "numberIsNaN");
  var fa = function() {
    let r = "0123456789abcdef", e = new Array(256);
    for (let t = 0;t < 16; ++t) {
      let n = t * 16;
      for (let i = 0;i < 16; ++i)
        e[n + i] = r[t] + r[i];
    }
    return e;
  }();
  function be(r) {
    return typeof BigInt > "u" ? ha : r;
  }
  a(be, "defineBigIntMethod");
  function ha() {
    throw new Error("BigInt not supported");
  }
  a(ha, "BufferBigIntNotDefined");
});
var b;
var x;
var v;
var p;
var y;
var h = V(() => {
  b = globalThis, x = globalThis.setImmediate ?? ((r) => setTimeout(r, 0)), v = globalThis.clearImmediate ?? ((r) => clearTimeout(r)), p = typeof globalThis.Buffer == "function" && typeof globalThis.Buffer.allocUnsafe == "function" ? globalThis.Buffer : oi().Buffer, y = globalThis.process ?? {};
  y.env ?? (y.env = {});
  try {
    y.nextTick(() => {});
  } catch {
    let e = Promise.resolve();
    y.nextTick = e.then.bind(e);
  }
});
var ve = T((Ef, Xt) => {
  h();
  var Fe = typeof Reflect == "object" ? Reflect : null, mi = Fe && typeof Fe.apply == "function" ? Fe.apply : a(function(e, t, n) {
    return Function.prototype.apply.call(e, t, n);
  }, "ReflectApply"), bt;
  Fe && typeof Fe.ownKeys == "function" ? bt = Fe.ownKeys : Object.getOwnPropertySymbols ? bt = a(function(e) {
    return Object.getOwnPropertyNames(e).concat(Object.getOwnPropertySymbols(e));
  }, "ReflectOwnKeys") : bt = a(function(e) {
    return Object.getOwnPropertyNames(e);
  }, "ReflectOwnKeys");
  function Ia(r) {
    console && console.warn && console.warn(r);
  }
  a(Ia, "ProcessEmitWarning");
  var wi = Number.isNaN || a(function(e) {
    return e !== e;
  }, "NumberIsNaN");
  function P() {
    P.init.call(this);
  }
  a(P, "EventEmitter");
  Xt.exports = P;
  Xt.exports.once = Ba;
  P.EventEmitter = P;
  P.prototype._events = undefined;
  P.prototype._eventsCount = 0;
  P.prototype._maxListeners = undefined;
  var gi = 10;
  function xt(r) {
    if (typeof r != "function")
      throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof r);
  }
  a(xt, "checkListener");
  Object.defineProperty(P, "defaultMaxListeners", { enumerable: true, get: a(function() {
    return gi;
  }, "get"), set: a(function(r) {
    if (typeof r != "number" || r < 0 || wi(r))
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + r + ".");
    gi = r;
  }, "set") });
  P.init = function() {
    (this._events === undefined || this._events === Object.getPrototypeOf(this)._events) && (this._events = Object.create(null), this._eventsCount = 0), this._maxListeners = this._maxListeners || undefined;
  };
  P.prototype.setMaxListeners = a(function(e) {
    if (typeof e != "number" || e < 0 || wi(e))
      throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + e + ".");
    return this._maxListeners = e, this;
  }, "setMaxListeners");
  function bi(r) {
    return r._maxListeners === undefined ? P.defaultMaxListeners : r._maxListeners;
  }
  a(bi, "_getMaxListeners");
  P.prototype.getMaxListeners = a(function() {
    return bi(this);
  }, "getMaxListeners");
  P.prototype.emit = a(function(e) {
    for (var t = [], n = 1;n < arguments.length; n++)
      t.push(arguments[n]);
    var i = e === "error", s = this._events;
    if (s !== undefined)
      i = i && s.error === undefined;
    else if (!i)
      return false;
    if (i) {
      var o;
      if (t.length > 0 && (o = t[0]), o instanceof Error)
        throw o;
      var u = new Error("Unhandled error." + (o ? " (" + o.message + ")" : ""));
      throw u.context = o, u;
    }
    var c = s[e];
    if (c === undefined)
      return false;
    if (typeof c == "function")
      mi(c, this, t);
    else
      for (var l = c.length, f = Ai(c, l), n = 0;n < l; ++n)
        mi(f[n], this, t);
    return true;
  }, "emit");
  function xi(r, e, t, n) {
    var i, s, o;
    if (xt(t), s = r._events, s === undefined ? (s = r._events = Object.create(null), r._eventsCount = 0) : (s.newListener !== undefined && (r.emit("newListener", e, t.listener ? t.listener : t), s = r._events), o = s[e]), o === undefined)
      o = s[e] = t, ++r._eventsCount;
    else if (typeof o == "function" ? o = s[e] = n ? [t, o] : [o, t] : n ? o.unshift(t) : o.push(t), i = bi(r), i > 0 && o.length > i && !o.warned) {
      o.warned = true;
      var u = new Error("Possible EventEmitter memory leak detected. " + o.length + " " + String(e) + " listeners added. Use emitter.setMaxListeners() to increase limit");
      u.name = "MaxListenersExceededWarning", u.emitter = r, u.type = e, u.count = o.length, Ia(u);
    }
    return r;
  }
  a(xi, "_addListener");
  P.prototype.addListener = a(function(e, t) {
    return xi(this, e, t, false);
  }, "addListener");
  P.prototype.on = P.prototype.addListener;
  P.prototype.prependListener = a(function(e, t) {
    return xi(this, e, t, true);
  }, "prependListener");
  function Pa() {
    if (!this.fired)
      return this.target.removeListener(this.type, this.wrapFn), this.fired = true, arguments.length === 0 ? this.listener.call(this.target) : this.listener.apply(this.target, arguments);
  }
  a(Pa, "onceWrapper");
  function vi(r, e, t) {
    var n = {
      fired: false,
      wrapFn: undefined,
      target: r,
      type: e,
      listener: t
    }, i = Pa.bind(n);
    return i.listener = t, n.wrapFn = i, i;
  }
  a(vi, "_onceWrap");
  P.prototype.once = a(function(e, t) {
    return xt(t), this.on(e, vi(this, e, t)), this;
  }, "once");
  P.prototype.prependOnceListener = a(function(e, t) {
    return xt(t), this.prependListener(e, vi(this, e, t)), this;
  }, "prependOnceListener");
  P.prototype.removeListener = a(function(e, t) {
    var n, i, s, o, u;
    if (xt(t), i = this._events, i === undefined)
      return this;
    if (n = i[e], n === undefined)
      return this;
    if (n === t || n.listener === t)
      --this._eventsCount === 0 ? this._events = Object.create(null) : (delete i[e], i.removeListener && this.emit("removeListener", e, n.listener || t));
    else if (typeof n != "function") {
      for (s = -1, o = n.length - 1;o >= 0; o--)
        if (n[o] === t || n[o].listener === t) {
          u = n[o].listener, s = o;
          break;
        }
      if (s < 0)
        return this;
      s === 0 ? n.shift() : Ra(n, s), n.length === 1 && (i[e] = n[0]), i.removeListener !== undefined && this.emit("removeListener", e, u || t);
    }
    return this;
  }, "removeListener");
  P.prototype.off = P.prototype.removeListener;
  P.prototype.removeAllListeners = a(function(e) {
    var t, n, i;
    if (n = this._events, n === undefined)
      return this;
    if (n.removeListener === undefined)
      return arguments.length === 0 ? (this._events = Object.create(null), this._eventsCount = 0) : n[e] !== undefined && (--this._eventsCount === 0 ? this._events = Object.create(null) : delete n[e]), this;
    if (arguments.length === 0) {
      var s = Object.keys(n), o;
      for (i = 0;i < s.length; ++i)
        o = s[i], o !== "removeListener" && this.removeAllListeners(o);
      return this.removeAllListeners("removeListener"), this._events = Object.create(null), this._eventsCount = 0, this;
    }
    if (t = n[e], typeof t == "function")
      this.removeListener(e, t);
    else if (t !== undefined)
      for (i = t.length - 1;i >= 0; i--)
        this.removeListener(e, t[i]);
    return this;
  }, "removeAllListeners");
  function Si(r, e, t) {
    var n = r._events;
    if (n === undefined)
      return [];
    var i = n[e];
    return i === undefined ? [] : typeof i == "function" ? t ? [i.listener || i] : [i] : t ? La(i) : Ai(i, i.length);
  }
  a(Si, "_listeners");
  P.prototype.listeners = a(function(e) {
    return Si(this, e, true);
  }, "listeners");
  P.prototype.rawListeners = a(function(e) {
    return Si(this, e, false);
  }, "rawListeners");
  P.listenerCount = function(r, e) {
    return typeof r.listenerCount == "function" ? r.listenerCount(e) : Ei.call(r, e);
  };
  P.prototype.listenerCount = Ei;
  function Ei(r) {
    var e = this._events;
    if (e !== undefined) {
      var t = e[r];
      if (typeof t == "function")
        return 1;
      if (t !== undefined)
        return t.length;
    }
    return 0;
  }
  a(Ei, "listenerCount");
  P.prototype.eventNames = a(function() {
    return this._eventsCount > 0 ? bt(this._events) : [];
  }, "eventNames");
  function Ai(r, e) {
    for (var t = new Array(e), n = 0;n < e; ++n)
      t[n] = r[n];
    return t;
  }
  a(Ai, "arrayClone");
  function Ra(r, e) {
    for (;e + 1 < r.length; e++)
      r[e] = r[e + 1];
    r.pop();
  }
  a(Ra, "spliceOne");
  function La(r) {
    for (var e = new Array(r.length), t = 0;t < e.length; ++t)
      e[t] = r[t].listener || r[t];
    return e;
  }
  a(La, "unwrapListeners");
  function Ba(r, e) {
    return new Promise(function(t, n) {
      function i(o) {
        r.removeListener(e, s), n(o);
      }
      a(i, "errorListener");
      function s() {
        typeof r.removeListener == "function" && r.removeListener("error", i), t([].slice.call(arguments));
      }
      a(s, "resolver"), Ci(r, e, s, { once: true }), e !== "error" && Fa(r, i, { once: true });
    });
  }
  a(Ba, "once");
  function Fa(r, e, t) {
    typeof r.on == "function" && Ci(r, "error", e, t);
  }
  a(Fa, "addErrorHandlerIfEventEmitter");
  function Ci(r, e, t, n) {
    if (typeof r.on == "function")
      n.once ? r.once(e, t) : r.on(e, t);
    else if (typeof r.addEventListener == "function")
      r.addEventListener(e, a(function i(s) {
        n.once && r.removeEventListener(e, i), t(s);
      }, "wrapListener"));
    else
      throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof r);
  }
  a(Ci, "eventTargetAgnosticAddListener");
});
var Ii = {};
se(Ii, { Socket: () => pe, isIP: () => Ma });
function Ma(r) {
  return 0;
}
var Ti;
var _i;
var A;
var pe;
var Ge = V(() => {
  h();
  Ti = we(ve(), 1);
  a(Ma, "isIP");
  _i = /^[^.]+\./, A = class A2 extends Ti.EventEmitter {
    constructor() {
      super(...arguments);
      E(this, "opts", {});
      E(this, "connecting", false);
      E(this, "pending", true);
      E(this, "writable", true);
      E(this, "encrypted", false);
      E(this, "authorized", false);
      E(this, "destroyed", false);
      E(this, "ws", null);
      E(this, "writeBuffer");
      E(this, "tlsState", 0);
      E(this, "tlsRead");
      E(this, "tlsWrite");
    }
    static get poolQueryViaFetch() {
      return A2.opts.poolQueryViaFetch ?? A2.defaults.poolQueryViaFetch;
    }
    static set poolQueryViaFetch(t) {
      A2.opts.poolQueryViaFetch = t;
    }
    static get fetchEndpoint() {
      return A2.opts.fetchEndpoint ?? A2.defaults.fetchEndpoint;
    }
    static set fetchEndpoint(t) {
      A2.opts.fetchEndpoint = t;
    }
    static get fetchConnectionCache() {
      return true;
    }
    static set fetchConnectionCache(t) {
      console.warn("The `fetchConnectionCache` option is deprecated (now always `true`)");
    }
    static get fetchFunction() {
      return A2.opts.fetchFunction ?? A2.defaults.fetchFunction;
    }
    static set fetchFunction(t) {
      A2.opts.fetchFunction = t;
    }
    static get webSocketConstructor() {
      return A2.opts.webSocketConstructor ?? A2.defaults.webSocketConstructor;
    }
    static set webSocketConstructor(t) {
      A2.opts.webSocketConstructor = t;
    }
    get webSocketConstructor() {
      return this.opts.webSocketConstructor ?? A2.webSocketConstructor;
    }
    set webSocketConstructor(t) {
      this.opts.webSocketConstructor = t;
    }
    static get wsProxy() {
      return A2.opts.wsProxy ?? A2.defaults.wsProxy;
    }
    static set wsProxy(t) {
      A2.opts.wsProxy = t;
    }
    get wsProxy() {
      return this.opts.wsProxy ?? A2.wsProxy;
    }
    set wsProxy(t) {
      this.opts.wsProxy = t;
    }
    static get coalesceWrites() {
      return A2.opts.coalesceWrites ?? A2.defaults.coalesceWrites;
    }
    static set coalesceWrites(t) {
      A2.opts.coalesceWrites = t;
    }
    get coalesceWrites() {
      return this.opts.coalesceWrites ?? A2.coalesceWrites;
    }
    set coalesceWrites(t) {
      this.opts.coalesceWrites = t;
    }
    static get useSecureWebSocket() {
      return A2.opts.useSecureWebSocket ?? A2.defaults.useSecureWebSocket;
    }
    static set useSecureWebSocket(t) {
      A2.opts.useSecureWebSocket = t;
    }
    get useSecureWebSocket() {
      return this.opts.useSecureWebSocket ?? A2.useSecureWebSocket;
    }
    set useSecureWebSocket(t) {
      this.opts.useSecureWebSocket = t;
    }
    static get forceDisablePgSSL() {
      return A2.opts.forceDisablePgSSL ?? A2.defaults.forceDisablePgSSL;
    }
    static set forceDisablePgSSL(t) {
      A2.opts.forceDisablePgSSL = t;
    }
    get forceDisablePgSSL() {
      return this.opts.forceDisablePgSSL ?? A2.forceDisablePgSSL;
    }
    set forceDisablePgSSL(t) {
      this.opts.forceDisablePgSSL = t;
    }
    static get disableSNI() {
      return A2.opts.disableSNI ?? A2.defaults.disableSNI;
    }
    static set disableSNI(t) {
      A2.opts.disableSNI = t;
    }
    get disableSNI() {
      return this.opts.disableSNI ?? A2.disableSNI;
    }
    set disableSNI(t) {
      this.opts.disableSNI = t;
    }
    static get disableWarningInBrowsers() {
      return A2.opts.disableWarningInBrowsers ?? A2.defaults.disableWarningInBrowsers;
    }
    static set disableWarningInBrowsers(t) {
      A2.opts.disableWarningInBrowsers = t;
    }
    get disableWarningInBrowsers() {
      return this.opts.disableWarningInBrowsers ?? A2.disableWarningInBrowsers;
    }
    set disableWarningInBrowsers(t) {
      this.opts.disableWarningInBrowsers = t;
    }
    static get pipelineConnect() {
      return A2.opts.pipelineConnect ?? A2.defaults.pipelineConnect;
    }
    static set pipelineConnect(t) {
      A2.opts.pipelineConnect = t;
    }
    get pipelineConnect() {
      return this.opts.pipelineConnect ?? A2.pipelineConnect;
    }
    set pipelineConnect(t) {
      this.opts.pipelineConnect = t;
    }
    static get subtls() {
      return A2.opts.subtls ?? A2.defaults.subtls;
    }
    static set subtls(t) {
      A2.opts.subtls = t;
    }
    get subtls() {
      return this.opts.subtls ?? A2.subtls;
    }
    set subtls(t) {
      this.opts.subtls = t;
    }
    static get pipelineTLS() {
      return A2.opts.pipelineTLS ?? A2.defaults.pipelineTLS;
    }
    static set pipelineTLS(t) {
      A2.opts.pipelineTLS = t;
    }
    get pipelineTLS() {
      return this.opts.pipelineTLS ?? A2.pipelineTLS;
    }
    set pipelineTLS(t) {
      this.opts.pipelineTLS = t;
    }
    static get rootCerts() {
      return A2.opts.rootCerts ?? A2.defaults.rootCerts;
    }
    static set rootCerts(t) {
      A2.opts.rootCerts = t;
    }
    get rootCerts() {
      return this.opts.rootCerts ?? A2.rootCerts;
    }
    set rootCerts(t) {
      this.opts.rootCerts = t;
    }
    wsProxyAddrForHost(t, n) {
      let i = this.wsProxy;
      if (i === undefined)
        throw new Error("No WebSocket proxy is configured. Please see https://github.com/neondatabase/serverless/blob/main/CONFIG.md#wsproxy-string--host-string-port-number--string--string");
      return typeof i == "function" ? i(t, n) : `${i}?address=${t}:${n}`;
    }
    setNoDelay() {
      return this;
    }
    setKeepAlive() {
      return this;
    }
    ref() {
      return this;
    }
    unref() {
      return this;
    }
    connect(t, n, i) {
      this.connecting = true, i && this.once("connect", i);
      let s = a(() => {
        this.connecting = false, this.pending = false, this.emit("connect"), this.emit("ready");
      }, "handleWebSocketOpen"), o = a((c, l = false) => {
        c.binaryType = "arraybuffer", c.addEventListener("error", (f) => {
          this.emit("error", f), this.emit("close");
        }), c.addEventListener("message", (f) => {
          if (this.tlsState === 0) {
            let m = p.from(f.data);
            this.emit("data", m);
          }
        }), c.addEventListener("close", () => {
          this.destroyed = true, this.emit("close");
        }), l ? s() : c.addEventListener("open", s);
      }, "configureWebSocket"), u;
      try {
        u = this.wsProxyAddrForHost(n, typeof t == "string" ? parseInt(t, 10) : t);
      } catch (c) {
        this.emit("error", c), this.emit("close");
        return;
      }
      try {
        let l = (this.useSecureWebSocket ? "wss:" : "ws:") + "//" + u;
        if (this.webSocketConstructor !== undefined)
          this.ws = new this.webSocketConstructor(l), o(this.ws);
        else
          try {
            this.ws = new WebSocket(l), o(this.ws);
          } catch {
            this.ws = new __unstable_WebSocket(l), o(this.ws);
          }
      } catch (c) {
        let f = (this.useSecureWebSocket ? "https:" : "http:") + "//" + u;
        fetch(f, { headers: { Upgrade: "websocket" } }).then((m) => {
          if (this.ws = m.webSocket, this.ws == null)
            throw c;
          this.ws.accept(), o(this.ws, true);
        }).catch((m) => {
          this.emit("error", new Error(`All attempts to open a WebSocket to connect to the database failed. Please refer to https://github.com/neondatabase/serverless/blob/main/CONFIG.md#websocketconstructor-typeof-websocket--undefined. Details: ${m}`)), this.emit("close");
        });
      }
    }
    async startTls(t) {
      if (this.subtls === undefined)
        throw new Error("For Postgres SSL connections, you must set `neonConfig.subtls` to the subtls library. See https://github.com/neondatabase/serverless/blob/main/CONFIG.md for more information.");
      this.tlsState = 1;
      let n = await this.subtls.TrustedCert.databaseFromPEM(this.rootCerts), i = new this.subtls.WebSocketReadQueue(this.ws), s = i.read.bind(i), o = this.rawWrite.bind(this), { read: u, write: c } = await this.subtls.startTls(t, n, s, o, { useSNI: !this.disableSNI, expectPreData: this.pipelineTLS ? new Uint8Array([83]) : undefined });
      this.tlsRead = u, this.tlsWrite = c, this.tlsState = 2, this.encrypted = true, this.authorized = true, this.emit("secureConnection", this), this.tlsReadLoop().catch((l) => {
        this.destroyed || (this.destroyed = true, this.emit("error", l), this.ws?.close());
      });
    }
    async tlsReadLoop() {
      for (;; ) {
        let t = await this.tlsRead();
        if (t === undefined)
          break;
        {
          let n = p.from(t);
          this.emit("data", n);
        }
      }
    }
    rawWrite(t) {
      if (!this.coalesceWrites) {
        this.ws && this.ws.send(t);
        return;
      }
      if (this.writeBuffer === undefined)
        this.writeBuffer = t, setTimeout(() => {
          this.ws && this.ws.send(this.writeBuffer), this.writeBuffer = undefined;
        }, 0);
      else {
        let n = new Uint8Array(this.writeBuffer.length + t.length);
        n.set(this.writeBuffer), n.set(t, this.writeBuffer.length), this.writeBuffer = n;
      }
    }
    write(t, n = "utf8", i = (s) => {}) {
      return t.length === 0 ? (i(), true) : (typeof t == "string" && (t = p.from(t, n)), this.tlsState === 0 ? (this.rawWrite(t), i()) : this.tlsState === 1 ? this.once("secureConnection", () => {
        this.write(t, n, i);
      }) : (this.tlsWrite(t), i()), true);
    }
    end(t = p.alloc(0), n = "utf8", i = () => {}) {
      return this.write(t, n, () => {
        this.ws?.close(), i();
      }), this;
    }
    destroy() {
      return this.destroyed = true, this.end();
    }
  };
  a(A, "Socket"), E(A, "defaults", {
    poolQueryViaFetch: false,
    fetchEndpoint: a((t, n, i) => {
      let s;
      return i?.jwtAuth ? s = t.replace(_i, "apiauth.") : s = t.replace(_i, "api."), "https://" + s + "/sql";
    }, "fetchEndpoint"),
    fetchConnectionCache: true,
    fetchFunction: undefined,
    webSocketConstructor: undefined,
    wsProxy: a((t) => t + "/v2", "wsProxy"),
    useSecureWebSocket: true,
    forceDisablePgSSL: true,
    coalesceWrites: true,
    pipelineConnect: "password",
    subtls: undefined,
    rootCerts: "",
    pipelineTLS: false,
    disableSNI: false,
    disableWarningInBrowsers: false
  }), E(A, "opts", {});
  pe = A;
});
var tr = T((Pi) => {
  h();
  Pi.parse = function(r, e) {
    return new er(r, e).parse();
  };
  var St = class St2 {
    constructor(e, t) {
      this.source = e, this.transform = t || ka, this.position = 0, this.entries = [], this.recorded = [], this.dimension = 0;
    }
    isEof() {
      return this.position >= this.source.length;
    }
    nextCharacter() {
      var e = this.source[this.position++];
      return e === "\\" ? { value: this.source[this.position++], escaped: true } : { value: e, escaped: false };
    }
    record(e) {
      this.recorded.push(e);
    }
    newEntry(e) {
      var t;
      (this.recorded.length > 0 || e) && (t = this.recorded.join(""), t === "NULL" && !e && (t = null), t !== null && (t = this.transform(t)), this.entries.push(t), this.recorded = []);
    }
    consumeDimensions() {
      if (this.source[0] === "[")
        for (;!this.isEof(); ) {
          var e = this.nextCharacter();
          if (e.value === "=")
            break;
        }
    }
    parse(e) {
      var t, n, i;
      for (this.consumeDimensions();!this.isEof(); )
        if (t = this.nextCharacter(), t.value === "{" && !i)
          this.dimension++, this.dimension > 1 && (n = new St2(this.source.substr(this.position - 1), this.transform), this.entries.push(n.parse(true)), this.position += n.position - 2);
        else if (t.value === "}" && !i) {
          if (this.dimension--, !this.dimension && (this.newEntry(), e))
            return this.entries;
        } else
          t.value === '"' && !t.escaped ? (i && this.newEntry(true), i = !i) : t.value === "," && !i ? this.newEntry() : this.record(t.value);
      if (this.dimension !== 0)
        throw new Error("array dimension not balanced");
      return this.entries;
    }
  };
  a(St, "ArrayParser");
  var er = St;
  function ka(r) {
    return r;
  }
  a(ka, "identity");
});
var rr = T((Ff, Ri) => {
  h();
  var Oa = tr();
  Ri.exports = { create: a(function(r, e) {
    return { parse: a(function() {
      return Oa.parse(r, e);
    }, "parse") };
  }, "create") };
});
var Fi = T((Of, Bi) => {
  h();
  var Ua = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/, Qa = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/, Da = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/, qa = /^-?infinity$/;
  Bi.exports = a(function(e) {
    if (qa.test(e))
      return Number(e.replace("i", "I"));
    var t = Ua.exec(e);
    if (!t)
      return Na(e) || null;
    var n = !!t[8], i = parseInt(t[1], 10);
    n && (i = Li(i));
    var s = parseInt(t[2], 10) - 1, o = t[3], u = parseInt(t[4], 10), c = parseInt(t[5], 10), l = parseInt(t[6], 10), f = t[7];
    f = f ? 1000 * parseFloat(f) : 0;
    var m, g = Wa(e);
    return g != null ? (m = new Date(Date.UTC(i, s, o, u, c, l, f)), nr(i) && m.setUTCFullYear(i), g !== 0 && m.setTime(m.getTime() - g)) : (m = new Date(i, s, o, u, c, l, f), nr(i) && m.setFullYear(i)), m;
  }, "parseDate");
  function Na(r) {
    var e = Qa.exec(r);
    if (e) {
      var t = parseInt(e[1], 10), n = !!e[4];
      n && (t = Li(t));
      var i = parseInt(e[2], 10) - 1, s = e[3], o = new Date(t, i, s);
      return nr(t) && o.setFullYear(t), o;
    }
  }
  a(Na, "getDate");
  function Wa(r) {
    if (r.endsWith("+00"))
      return 0;
    var e = Da.exec(r.split(" ")[1]);
    if (e) {
      var t = e[1];
      if (t === "Z")
        return 0;
      var n = t === "-" ? -1 : 1, i = parseInt(e[2], 10) * 3600 + parseInt(e[3] || 0, 10) * 60 + parseInt(e[4] || 0, 10);
      return i * n * 1000;
    }
  }
  a(Wa, "timeZoneOffset");
  function Li(r) {
    return -(r - 1);
  }
  a(Li, "bcYearToNegativeYear");
  function nr(r) {
    return r >= 0 && r < 100;
  }
  a(nr, "is0To99");
});
var ki = T((Df, Mi) => {
  h();
  Mi.exports = Ha;
  var ja = Object.prototype.hasOwnProperty;
  function Ha(r) {
    for (var e = 1;e < arguments.length; e++) {
      var t = arguments[e];
      for (var n in t)
        ja.call(t, n) && (r[n] = t[n]);
    }
    return r;
  }
  a(Ha, "extend");
});
var Qi = T((Wf, Ui) => {
  h();
  var $a = ki();
  Ui.exports = Me;
  function Me(r) {
    if (!(this instanceof Me))
      return new Me(r);
    $a(this, nu(r));
  }
  a(Me, "PostgresInterval");
  var Ga = [
    "seconds",
    "minutes",
    "hours",
    "days",
    "months",
    "years"
  ];
  Me.prototype.toPostgres = function() {
    var r = Ga.filter(this.hasOwnProperty, this);
    return this.milliseconds && r.indexOf("seconds") < 0 && r.push("seconds"), r.length === 0 ? "0" : r.map(function(e) {
      var t = this[e] || 0;
      return e === "seconds" && this.milliseconds && (t = (t + this.milliseconds / 1000).toFixed(6).replace(/\.?0+$/, "")), t + " " + e;
    }, this).join(" ");
  };
  var Va = { years: "Y", months: "M", days: "D", hours: "H", minutes: "M", seconds: "S" }, za = ["years", "months", "days"], Ka = ["hours", "minutes", "seconds"];
  Me.prototype.toISOString = Me.prototype.toISO = function() {
    var r = za.map(t, this).join(""), e = Ka.map(t, this).join("");
    return "P" + r + "T" + e;
    function t(n) {
      var i = this[n] || 0;
      return n === "seconds" && this.milliseconds && (i = (i + this.milliseconds / 1000).toFixed(6).replace(/0+$/, "")), i + Va[n];
    }
  };
  var ir = "([+-]?\\d+)", Ya = ir + "\\s+years?", Za = ir + "\\s+mons?", Ja = ir + "\\s+days?", Xa = "([+-])?([\\d]*):(\\d\\d):(\\d\\d)\\.?(\\d{1,6})?", eu = new RegExp([Ya, Za, Ja, Xa].map(function(r) {
    return "(" + r + ")?";
  }).join("\\s*")), Oi = { years: 2, months: 4, days: 6, hours: 9, minutes: 10, seconds: 11, milliseconds: 12 }, tu = ["hours", "minutes", "seconds", "milliseconds"];
  function ru(r) {
    var e = r + "000000".slice(r.length);
    return parseInt(e, 10) / 1000;
  }
  a(ru, "parseMilliseconds");
  function nu(r) {
    if (!r)
      return {};
    var e = eu.exec(r), t = e[8] === "-";
    return Object.keys(Oi).reduce(function(n, i) {
      var s = Oi[i], o = e[s];
      return !o || (o = i === "milliseconds" ? ru(o) : parseInt(o, 10), !o) || (t && ~tu.indexOf(i) && (o *= -1), n[i] = o), n;
    }, {});
  }
  a(nu, "parse");
});
var Ni = T(($f, qi) => {
  h();
  var Di = p.from || p;
  qi.exports = a(function(e) {
    if (/^\\x/.test(e))
      return Di(e.substr(2), "hex");
    for (var t = "", n = 0;n < e.length; )
      if (e[n] !== "\\")
        t += e[n], ++n;
      else if (/[0-7]{3}/.test(e.substr(n + 1, 3)))
        t += String.fromCharCode(parseInt(e.substr(n + 1, 3), 8)), n += 4;
      else {
        for (var i = 1;n + i < e.length && e[n + i] === "\\"; )
          i++;
        for (var s = 0;s < Math.floor(i / 2); ++s)
          t += "\\";
        n += Math.floor(i / 2) * 2;
      }
    return Di(t, "binary");
  }, "parseBytea");
});
var zi = T((zf, Vi) => {
  h();
  var Ve = tr(), ze = rr(), Et = Fi(), ji = Qi(), Hi = Ni();
  function At(r) {
    return a(function(t) {
      return t === null ? t : r(t);
    }, "nullAllowed");
  }
  a(At, "allowNull");
  function $i(r) {
    return r === null ? r : r === "TRUE" || r === "t" || r === "true" || r === "y" || r === "yes" || r === "on" || r === "1";
  }
  a($i, "parseBool");
  function iu(r) {
    return r ? Ve.parse(r, $i) : null;
  }
  a(iu, "parseBoolArray");
  function su(r) {
    return parseInt(r, 10);
  }
  a(su, "parseBaseTenInt");
  function sr(r) {
    return r ? Ve.parse(r, At(su)) : null;
  }
  a(sr, "parseIntegerArray");
  function ou(r) {
    return r ? Ve.parse(r, At(function(e) {
      return Gi(e).trim();
    })) : null;
  }
  a(ou, "parseBigIntegerArray");
  var au = a(function(r) {
    if (!r)
      return null;
    var e = ze.create(r, function(t) {
      return t !== null && (t = cr(t)), t;
    });
    return e.parse();
  }, "parsePointArray"), or = a(function(r) {
    if (!r)
      return null;
    var e = ze.create(r, function(t) {
      return t !== null && (t = parseFloat(t)), t;
    });
    return e.parse();
  }, "parseFloatArray"), ee = a(function(r) {
    if (!r)
      return null;
    var e = ze.create(r);
    return e.parse();
  }, "parseStringArray"), ar = a(function(r) {
    if (!r)
      return null;
    var e = ze.create(r, function(t) {
      return t !== null && (t = Et(t)), t;
    });
    return e.parse();
  }, "parseDateArray"), uu = a(function(r) {
    if (!r)
      return null;
    var e = ze.create(r, function(t) {
      return t !== null && (t = ji(t)), t;
    });
    return e.parse();
  }, "parseIntervalArray"), cu = a(function(r) {
    return r ? Ve.parse(r, At(Hi)) : null;
  }, "parseByteAArray"), ur = a(function(r) {
    return parseInt(r, 10);
  }, "parseInteger"), Gi = a(function(r) {
    var e = String(r);
    return /^\d+$/.test(e) ? e : r;
  }, "parseBigInteger"), Wi = a(function(r) {
    return r ? Ve.parse(r, At(JSON.parse)) : null;
  }, "parseJsonArray"), cr = a(function(r) {
    return r[0] !== "(" ? null : (r = r.substring(1, r.length - 1).split(","), { x: parseFloat(r[0]), y: parseFloat(r[1]) });
  }, "parsePoint"), lu = a(function(r) {
    if (r[0] !== "<" && r[1] !== "(")
      return null;
    for (var e = "(", t = "", n = false, i = 2;i < r.length - 1; i++) {
      if (n || (e += r[i]), r[i] === ")") {
        n = true;
        continue;
      } else if (!n)
        continue;
      r[i] !== "," && (t += r[i]);
    }
    var s = cr(e);
    return s.radius = parseFloat(t), s;
  }, "parseCircle"), fu = a(function(r) {
    r(20, Gi), r(21, ur), r(23, ur), r(26, ur), r(700, parseFloat), r(701, parseFloat), r(16, $i), r(1082, Et), r(1114, Et), r(1184, Et), r(600, cr), r(651, ee), r(718, lu), r(1000, iu), r(1001, cu), r(1005, sr), r(1007, sr), r(1028, sr), r(1016, ou), r(1017, au), r(1021, or), r(1022, or), r(1231, or), r(1014, ee), r(1015, ee), r(1008, ee), r(1009, ee), r(1040, ee), r(1041, ee), r(1115, ar), r(1182, ar), r(1185, ar), r(1186, ji), r(1187, uu), r(17, Hi), r(114, JSON.parse.bind(JSON)), r(3802, JSON.parse.bind(JSON)), r(199, Wi), r(3807, Wi), r(3907, ee), r(2951, ee), r(791, ee), r(1183, ee), r(1270, ee);
  }, "init");
  Vi.exports = { init: fu };
});
var Yi = T((Zf, Ki) => {
  h();
  var K = 1e6;
  function hu(r) {
    var e = r.readInt32BE(0), t = r.readUInt32BE(4), n = "";
    e < 0 && (e = ~e + (t === 0), t = ~t + 1 >>> 0, n = "-");
    var i = "", s, o, u, c, l, f;
    {
      if (s = e % K, e = e / K >>> 0, o = 4294967296 * s + t, t = o / K >>> 0, u = "" + (o - K * t), t === 0 && e === 0)
        return n + u + i;
      for (c = "", l = 6 - u.length, f = 0;f < l; f++)
        c += "0";
      i = c + u + i;
    }
    {
      if (s = e % K, e = e / K >>> 0, o = 4294967296 * s + t, t = o / K >>> 0, u = "" + (o - K * t), t === 0 && e === 0)
        return n + u + i;
      for (c = "", l = 6 - u.length, f = 0;f < l; f++)
        c += "0";
      i = c + u + i;
    }
    {
      if (s = e % K, e = e / K >>> 0, o = 4294967296 * s + t, t = o / K >>> 0, u = "" + (o - K * t), t === 0 && e === 0)
        return n + u + i;
      for (c = "", l = 6 - u.length, f = 0;f < l; f++)
        c += "0";
      i = c + u + i;
    }
    return s = e % K, o = 4294967296 * s + t, u = "" + o % K, n + u + i;
  }
  a(hu, "readInt8");
  Ki.exports = hu;
});
var ts = T((eh, es) => {
  h();
  var du = Yi(), B = a(function(r, e, t, n, i) {
    t = t || 0, n = n || false, i = i || function(w, S, k) {
      return w * Math.pow(2, k) + S;
    };
    var s = t >> 3, o = a(function(w) {
      return n ? ~w & 255 : w;
    }, "inv"), u = 255, c = 8 - t % 8;
    e < c && (u = 255 << 8 - e & 255, c = e), t && (u = u >> t % 8);
    var l = 0;
    t % 8 + e >= 8 && (l = i(0, o(r[s]) & u, c));
    for (var f = e + t >> 3, m = s + 1;m < f; m++)
      l = i(l, o(r[m]), 8);
    var g = (e + t) % 8;
    return g > 0 && (l = i(l, o(r[f]) >> 8 - g, g)), l;
  }, "parseBits"), Xi = a(function(r, e, t) {
    var n = Math.pow(2, t - 1) - 1, i = B(r, 1), s = B(r, t, 1);
    if (s === 0)
      return 0;
    var o = 1, u = a(function(l, f, m) {
      l === 0 && (l = 1);
      for (var g = 1;g <= m; g++)
        o /= 2, (f & 1 << m - g) > 0 && (l += o);
      return l;
    }, "parsePrecisionBits"), c = B(r, e, t + 1, false, u);
    return s == Math.pow(2, t + 1) - 1 ? c === 0 ? i === 0 ? 1 / 0 : -1 / 0 : NaN : (i === 0 ? 1 : -1) * Math.pow(2, s - n) * c;
  }, "parseFloatFromBits"), pu = a(function(r) {
    return B(r, 1) == 1 ? -1 * (B(r, 15, 1, true) + 1) : B(r, 15, 1);
  }, "parseInt16"), Zi = a(function(r) {
    return B(r, 1) == 1 ? -1 * (B(r, 31, 1, true) + 1) : B(r, 31, 1);
  }, "parseInt32"), yu = a(function(r) {
    return Xi(r, 23, 8);
  }, "parseFloat32"), mu = a(function(r) {
    return Xi(r, 52, 11);
  }, "parseFloat64"), gu = a(function(r) {
    var e = B(r, 16, 32);
    if (e == 49152)
      return NaN;
    for (var t = Math.pow(1e4, B(r, 16, 16)), n = 0, i = [], s = B(r, 16), o = 0;o < s; o++)
      n += B(r, 16, 64 + 16 * o) * t, t /= 1e4;
    var u = Math.pow(10, B(r, 16, 48));
    return (e === 0 ? 1 : -1) * Math.round(n * u) / u;
  }, "parseNumeric"), Ji = a(function(r, e) {
    var t = B(e, 1), n = B(e, 63, 1), i = new Date((t === 0 ? 1 : -1) * n / 1000 + 946684800000);
    return r || i.setTime(i.getTime() + i.getTimezoneOffset() * 60000), i.usec = n % 1000, i.getMicroSeconds = function() {
      return this.usec;
    }, i.setMicroSeconds = function(s) {
      this.usec = s;
    }, i.getUTCMicroSeconds = function() {
      return this.usec;
    }, i;
  }, "parseDate"), Ke = a(function(r) {
    for (var e = B(r, 32), t = B(r, 32, 32), n = B(r, 32, 64), i = 96, s = [], o = 0;o < e; o++)
      s[o] = B(r, 32, i), i += 32, i += 32;
    var u = a(function(l) {
      var f = B(r, 32, i);
      if (i += 32, f == 4294967295)
        return null;
      var m;
      if (l == 23 || l == 20)
        return m = B(r, f * 8, i), i += f * 8, m;
      if (l == 25)
        return m = r.toString(this.encoding, i >> 3, (i += f << 3) >> 3), m;
      console.log("ERROR: ElementType not implemented: " + l);
    }, "parseElement"), c = a(function(l, f) {
      var m = [], g;
      if (l.length > 1) {
        var w = l.shift();
        for (g = 0;g < w; g++)
          m[g] = c(l, f);
        l.unshift(w);
      } else
        for (g = 0;g < l[0]; g++)
          m[g] = u(f);
      return m;
    }, "parse");
    return c(s, n);
  }, "parseArray"), wu = a(function(r) {
    return r.toString("utf8");
  }, "parseText"), bu = a(function(r) {
    return r === null ? null : B(r, 8) > 0;
  }, "parseBool"), xu = a(function(r) {
    r(20, du), r(21, pu), r(23, Zi), r(26, Zi), r(1700, gu), r(700, yu), r(701, mu), r(16, bu), r(1114, Ji.bind(null, false)), r(1184, Ji.bind(null, true)), r(1000, Ke), r(1007, Ke), r(1016, Ke), r(1008, Ke), r(1009, Ke), r(25, wu);
  }, "init");
  es.exports = { init: xu };
});
var ns = T((nh, rs) => {
  h();
  rs.exports = {
    BOOL: 16,
    BYTEA: 17,
    CHAR: 18,
    INT8: 20,
    INT2: 21,
    INT4: 23,
    REGPROC: 24,
    TEXT: 25,
    OID: 26,
    TID: 27,
    XID: 28,
    CID: 29,
    JSON: 114,
    XML: 142,
    PG_NODE_TREE: 194,
    SMGR: 210,
    PATH: 602,
    POLYGON: 604,
    CIDR: 650,
    FLOAT4: 700,
    FLOAT8: 701,
    ABSTIME: 702,
    RELTIME: 703,
    TINTERVAL: 704,
    CIRCLE: 718,
    MACADDR8: 774,
    MONEY: 790,
    MACADDR: 829,
    INET: 869,
    ACLITEM: 1033,
    BPCHAR: 1042,
    VARCHAR: 1043,
    DATE: 1082,
    TIME: 1083,
    TIMESTAMP: 1114,
    TIMESTAMPTZ: 1184,
    INTERVAL: 1186,
    TIMETZ: 1266,
    BIT: 1560,
    VARBIT: 1562,
    NUMERIC: 1700,
    REFCURSOR: 1790,
    REGPROCEDURE: 2202,
    REGOPER: 2203,
    REGOPERATOR: 2204,
    REGCLASS: 2205,
    REGTYPE: 2206,
    UUID: 2950,
    TXID_SNAPSHOT: 2970,
    PG_LSN: 3220,
    PG_NDISTINCT: 3361,
    PG_DEPENDENCIES: 3402,
    TSVECTOR: 3614,
    TSQUERY: 3615,
    GTSVECTOR: 3642,
    REGCONFIG: 3734,
    REGDICTIONARY: 3769,
    JSONB: 3802,
    REGNAMESPACE: 4089,
    REGROLE: 4096
  };
});
var Je = T((Ze) => {
  h();
  var vu = zi(), Su = ts(), Eu = rr(), Au = ns();
  Ze.getTypeParser = Cu;
  Ze.setTypeParser = _u;
  Ze.arrayParser = Eu;
  Ze.builtins = Au;
  var Ye = { text: {}, binary: {} };
  function is(r) {
    return String(r);
  }
  a(is, "noParse");
  function Cu(r, e) {
    return e = e || "text", Ye[e] && Ye[e][r] || is;
  }
  a(Cu, "getTypeParser");
  function _u(r, e, t) {
    typeof e == "function" && (t = e, e = "text"), Ye[e][r] = t;
  }
  a(_u, "setTypeParser");
  vu.init(function(r, e) {
    Ye.text[r] = e;
  });
  Su.init(function(r, e) {
    Ye.binary[r] = e;
  });
});
var _t = T((uh, ss) => {
  h();
  var Tu = Je();
  function Ct(r) {
    this._types = r || Tu, this.text = {}, this.binary = {};
  }
  a(Ct, "TypeOverrides");
  Ct.prototype.getOverrides = function(r) {
    switch (r) {
      case "text":
        return this.text;
      case "binary":
        return this.binary;
      default:
        return {};
    }
  };
  Ct.prototype.setTypeParser = function(r, e, t) {
    typeof e == "function" && (t = e, e = "text"), this.getOverrides(e)[r] = t;
  };
  Ct.prototype.getTypeParser = function(r, e) {
    return e = e || "text", this.getOverrides(e)[r] || this._types.getTypeParser(r, e);
  };
  ss.exports = Ct;
});
function Xe(r) {
  let e = 1779033703, t = 3144134277, n = 1013904242, i = 2773480762, s = 1359893119, o = 2600822924, u = 528734635, c = 1541459225, l = 0, f = 0, m = [
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ], g = a((I, C) => I >>> C | I << 32 - C, "rrot"), w = new Uint32Array(64), S = new Uint8Array(64), k = a(() => {
    for (let R = 0, $ = 0;R < 16; R++, $ += 4)
      w[R] = S[$] << 24 | S[$ + 1] << 16 | S[$ + 2] << 8 | S[$ + 3];
    for (let R = 16;R < 64; R++) {
      let $ = g(w[R - 15], 7) ^ g(w[R - 15], 18) ^ w[R - 15] >>> 3, Ee = g(w[R - 2], 17) ^ g(w[R - 2], 19) ^ w[R - 2] >>> 10;
      w[R] = w[R - 16] + $ + w[R - 7] + Ee | 0;
    }
    let I = e, C = t, re = n, ne = i, H = s, oe = o, ae = u, me = c;
    for (let R = 0;R < 64; R++) {
      let $ = g(H, 6) ^ g(H, 11) ^ g(H, 25), Ee = H & oe ^ ~H & ae, ue = me + $ + Ee + m[R] + w[R] | 0, Te = g(I, 2) ^ g(I, 13) ^ g(I, 22), ce = I & C ^ I & re ^ C & re, G = Te + ce | 0;
      me = ae, ae = oe, oe = H, H = ne + ue | 0, ne = re, re = C, C = I, I = ue + G | 0;
    }
    e = e + I | 0, t = t + C | 0, n = n + re | 0, i = i + ne | 0, s = s + H | 0, o = o + oe | 0, u = u + ae | 0, c = c + me | 0, f = 0;
  }, "process"), D = a((I) => {
    typeof I == "string" && (I = new TextEncoder().encode(I));
    for (let C = 0;C < I.length; C++)
      S[f++] = I[C], f === 64 && k();
    l += I.length;
  }, "add"), he = a(() => {
    if (S[f++] = 128, f == 64 && k(), f + 8 > 64) {
      for (;f < 64; )
        S[f++] = 0;
      k();
    }
    for (;f < 58; )
      S[f++] = 0;
    let I = l * 8;
    S[f++] = I / 1099511627776 & 255, S[f++] = I / 4294967296 & 255, S[f++] = I >>> 24, S[f++] = I >>> 16 & 255, S[f++] = I >>> 8 & 255, S[f++] = I & 255, k();
    let C = new Uint8Array(32);
    return C[0] = e >>> 24, C[1] = e >>> 16 & 255, C[2] = e >>> 8 & 255, C[3] = e & 255, C[4] = t >>> 24, C[5] = t >>> 16 & 255, C[6] = t >>> 8 & 255, C[7] = t & 255, C[8] = n >>> 24, C[9] = n >>> 16 & 255, C[10] = n >>> 8 & 255, C[11] = n & 255, C[12] = i >>> 24, C[13] = i >>> 16 & 255, C[14] = i >>> 8 & 255, C[15] = i & 255, C[16] = s >>> 24, C[17] = s >>> 16 & 255, C[18] = s >>> 8 & 255, C[19] = s & 255, C[20] = o >>> 24, C[21] = o >>> 16 & 255, C[22] = o >>> 8 & 255, C[23] = o & 255, C[24] = u >>> 24, C[25] = u >>> 16 & 255, C[26] = u >>> 8 & 255, C[27] = u & 255, C[28] = c >>> 24, C[29] = c >>> 16 & 255, C[30] = c >>> 8 & 255, C[31] = c & 255, C;
  }, "digest");
  return r === undefined ? { add: D, digest: he } : (D(r), he());
}
var os = V(() => {
  h();
  a(Xe, "sha256");
});
var M;
var et;
var as = V(() => {
  h();
  M = class M2 {
    constructor() {
      E(this, "_dataLength", 0);
      E(this, "_bufferLength", 0);
      E(this, "_state", new Int32Array(4));
      E(this, "_buffer", new ArrayBuffer(68));
      E(this, "_buffer8");
      E(this, "_buffer32");
      this._buffer8 = new Uint8Array(this._buffer, 0, 68), this._buffer32 = new Uint32Array(this._buffer, 0, 17), this.start();
    }
    static hashByteArray(e, t = false) {
      return this.onePassHasher.start().appendByteArray(e).end(t);
    }
    static hashStr(e, t = false) {
      return this.onePassHasher.start().appendStr(e).end(t);
    }
    static hashAsciiStr(e, t = false) {
      return this.onePassHasher.start().appendAsciiStr(e).end(t);
    }
    static _hex(e) {
      let { hexChars: t, hexOut: n } = M2, i, s, o, u;
      for (u = 0;u < 4; u += 1)
        for (s = u * 8, i = e[u], o = 0;o < 8; o += 2)
          n[s + 1 + o] = t.charAt(i & 15), i >>>= 4, n[s + 0 + o] = t.charAt(i & 15), i >>>= 4;
      return n.join("");
    }
    static _md5cycle(e, t) {
      let n = e[0], i = e[1], s = e[2], o = e[3];
      n += (i & s | ~i & o) + t[0] - 680876936 | 0, n = (n << 7 | n >>> 25) + i | 0, o += (n & i | ~n & s) + t[1] - 389564586 | 0, o = (o << 12 | o >>> 20) + n | 0, s += (o & n | ~o & i) + t[2] + 606105819 | 0, s = (s << 17 | s >>> 15) + o | 0, i += (s & o | ~s & n) + t[3] - 1044525330 | 0, i = (i << 22 | i >>> 10) + s | 0, n += (i & s | ~i & o) + t[4] - 176418897 | 0, n = (n << 7 | n >>> 25) + i | 0, o += (n & i | ~n & s) + t[5] + 1200080426 | 0, o = (o << 12 | o >>> 20) + n | 0, s += (o & n | ~o & i) + t[6] - 1473231341 | 0, s = (s << 17 | s >>> 15) + o | 0, i += (s & o | ~s & n) + t[7] - 45705983 | 0, i = (i << 22 | i >>> 10) + s | 0, n += (i & s | ~i & o) + t[8] + 1770035416 | 0, n = (n << 7 | n >>> 25) + i | 0, o += (n & i | ~n & s) + t[9] - 1958414417 | 0, o = (o << 12 | o >>> 20) + n | 0, s += (o & n | ~o & i) + t[10] - 42063 | 0, s = (s << 17 | s >>> 15) + o | 0, i += (s & o | ~s & n) + t[11] - 1990404162 | 0, i = (i << 22 | i >>> 10) + s | 0, n += (i & s | ~i & o) + t[12] + 1804603682 | 0, n = (n << 7 | n >>> 25) + i | 0, o += (n & i | ~n & s) + t[13] - 40341101 | 0, o = (o << 12 | o >>> 20) + n | 0, s += (o & n | ~o & i) + t[14] - 1502002290 | 0, s = (s << 17 | s >>> 15) + o | 0, i += (s & o | ~s & n) + t[15] + 1236535329 | 0, i = (i << 22 | i >>> 10) + s | 0, n += (i & o | s & ~o) + t[1] - 165796510 | 0, n = (n << 5 | n >>> 27) + i | 0, o += (n & s | i & ~s) + t[6] - 1069501632 | 0, o = (o << 9 | o >>> 23) + n | 0, s += (o & i | n & ~i) + t[11] + 643717713 | 0, s = (s << 14 | s >>> 18) + o | 0, i += (s & n | o & ~n) + t[0] - 373897302 | 0, i = (i << 20 | i >>> 12) + s | 0, n += (i & o | s & ~o) + t[5] - 701558691 | 0, n = (n << 5 | n >>> 27) + i | 0, o += (n & s | i & ~s) + t[10] + 38016083 | 0, o = (o << 9 | o >>> 23) + n | 0, s += (o & i | n & ~i) + t[15] - 660478335 | 0, s = (s << 14 | s >>> 18) + o | 0, i += (s & n | o & ~n) + t[4] - 405537848 | 0, i = (i << 20 | i >>> 12) + s | 0, n += (i & o | s & ~o) + t[9] + 568446438 | 0, n = (n << 5 | n >>> 27) + i | 0, o += (n & s | i & ~s) + t[14] - 1019803690 | 0, o = (o << 9 | o >>> 23) + n | 0, s += (o & i | n & ~i) + t[3] - 187363961 | 0, s = (s << 14 | s >>> 18) + o | 0, i += (s & n | o & ~n) + t[8] + 1163531501 | 0, i = (i << 20 | i >>> 12) + s | 0, n += (i & o | s & ~o) + t[13] - 1444681467 | 0, n = (n << 5 | n >>> 27) + i | 0, o += (n & s | i & ~s) + t[2] - 51403784 | 0, o = (o << 9 | o >>> 23) + n | 0, s += (o & i | n & ~i) + t[7] + 1735328473 | 0, s = (s << 14 | s >>> 18) + o | 0, i += (s & n | o & ~n) + t[12] - 1926607734 | 0, i = (i << 20 | i >>> 12) + s | 0, n += (i ^ s ^ o) + t[5] - 378558 | 0, n = (n << 4 | n >>> 28) + i | 0, o += (n ^ i ^ s) + t[8] - 2022574463 | 0, o = (o << 11 | o >>> 21) + n | 0, s += (o ^ n ^ i) + t[11] + 1839030562 | 0, s = (s << 16 | s >>> 16) + o | 0, i += (s ^ o ^ n) + t[14] - 35309556 | 0, i = (i << 23 | i >>> 9) + s | 0, n += (i ^ s ^ o) + t[1] - 1530992060 | 0, n = (n << 4 | n >>> 28) + i | 0, o += (n ^ i ^ s) + t[4] + 1272893353 | 0, o = (o << 11 | o >>> 21) + n | 0, s += (o ^ n ^ i) + t[7] - 155497632 | 0, s = (s << 16 | s >>> 16) + o | 0, i += (s ^ o ^ n) + t[10] - 1094730640 | 0, i = (i << 23 | i >>> 9) + s | 0, n += (i ^ s ^ o) + t[13] + 681279174 | 0, n = (n << 4 | n >>> 28) + i | 0, o += (n ^ i ^ s) + t[0] - 358537222 | 0, o = (o << 11 | o >>> 21) + n | 0, s += (o ^ n ^ i) + t[3] - 722521979 | 0, s = (s << 16 | s >>> 16) + o | 0, i += (s ^ o ^ n) + t[6] + 76029189 | 0, i = (i << 23 | i >>> 9) + s | 0, n += (i ^ s ^ o) + t[9] - 640364487 | 0, n = (n << 4 | n >>> 28) + i | 0, o += (n ^ i ^ s) + t[12] - 421815835 | 0, o = (o << 11 | o >>> 21) + n | 0, s += (o ^ n ^ i) + t[15] + 530742520 | 0, s = (s << 16 | s >>> 16) + o | 0, i += (s ^ o ^ n) + t[2] - 995338651 | 0, i = (i << 23 | i >>> 9) + s | 0, n += (s ^ (i | ~o)) + t[0] - 198630844 | 0, n = (n << 6 | n >>> 26) + i | 0, o += (i ^ (n | ~s)) + t[7] + 1126891415 | 0, o = (o << 10 | o >>> 22) + n | 0, s += (n ^ (o | ~i)) + t[14] - 1416354905 | 0, s = (s << 15 | s >>> 17) + o | 0, i += (o ^ (s | ~n)) + t[5] - 57434055 | 0, i = (i << 21 | i >>> 11) + s | 0, n += (s ^ (i | ~o)) + t[12] + 1700485571 | 0, n = (n << 6 | n >>> 26) + i | 0, o += (i ^ (n | ~s)) + t[3] - 1894986606 | 0, o = (o << 10 | o >>> 22) + n | 0, s += (n ^ (o | ~i)) + t[10] - 1051523 | 0, s = (s << 15 | s >>> 17) + o | 0, i += (o ^ (s | ~n)) + t[1] - 2054922799 | 0, i = (i << 21 | i >>> 11) + s | 0, n += (s ^ (i | ~o)) + t[8] + 1873313359 | 0, n = (n << 6 | n >>> 26) + i | 0, o += (i ^ (n | ~s)) + t[15] - 30611744 | 0, o = (o << 10 | o >>> 22) + n | 0, s += (n ^ (o | ~i)) + t[6] - 1560198380 | 0, s = (s << 15 | s >>> 17) + o | 0, i += (o ^ (s | ~n)) + t[13] + 1309151649 | 0, i = (i << 21 | i >>> 11) + s | 0, n += (s ^ (i | ~o)) + t[4] - 145523070 | 0, n = (n << 6 | n >>> 26) + i | 0, o += (i ^ (n | ~s)) + t[11] - 1120210379 | 0, o = (o << 10 | o >>> 22) + n | 0, s += (n ^ (o | ~i)) + t[2] + 718787259 | 0, s = (s << 15 | s >>> 17) + o | 0, i += (o ^ (s | ~n)) + t[9] - 343485551 | 0, i = (i << 21 | i >>> 11) + s | 0, e[0] = n + e[0] | 0, e[1] = i + e[1] | 0, e[2] = s + e[2] | 0, e[3] = o + e[3] | 0;
    }
    start() {
      return this._dataLength = 0, this._bufferLength = 0, this._state.set(M2.stateIdentity), this;
    }
    appendStr(e) {
      let t = this._buffer8, n = this._buffer32, i = this._bufferLength, s, o;
      for (o = 0;o < e.length; o += 1) {
        if (s = e.charCodeAt(o), s < 128)
          t[i++] = s;
        else if (s < 2048)
          t[i++] = (s >>> 6) + 192, t[i++] = s & 63 | 128;
        else if (s < 55296 || s > 56319)
          t[i++] = (s >>> 12) + 224, t[i++] = s >>> 6 & 63 | 128, t[i++] = s & 63 | 128;
        else {
          if (s = (s - 55296) * 1024 + (e.charCodeAt(++o) - 56320) + 65536, s > 1114111)
            throw new Error("Unicode standard supports code points up to U+10FFFF");
          t[i++] = (s >>> 18) + 240, t[i++] = s >>> 12 & 63 | 128, t[i++] = s >>> 6 & 63 | 128, t[i++] = s & 63 | 128;
        }
        i >= 64 && (this._dataLength += 64, M2._md5cycle(this._state, n), i -= 64, n[0] = n[16]);
      }
      return this._bufferLength = i, this;
    }
    appendAsciiStr(e) {
      let t = this._buffer8, n = this._buffer32, i = this._bufferLength, s, o = 0;
      for (;; ) {
        for (s = Math.min(e.length - o, 64 - i);s--; )
          t[i++] = e.charCodeAt(o++);
        if (i < 64)
          break;
        this._dataLength += 64, M2._md5cycle(this._state, n), i = 0;
      }
      return this._bufferLength = i, this;
    }
    appendByteArray(e) {
      let t = this._buffer8, n = this._buffer32, i = this._bufferLength, s, o = 0;
      for (;; ) {
        for (s = Math.min(e.length - o, 64 - i);s--; )
          t[i++] = e[o++];
        if (i < 64)
          break;
        this._dataLength += 64, M2._md5cycle(this._state, n), i = 0;
      }
      return this._bufferLength = i, this;
    }
    getState() {
      let e = this._state;
      return { buffer: String.fromCharCode.apply(null, Array.from(this._buffer8)), buflen: this._bufferLength, length: this._dataLength, state: [e[0], e[1], e[2], e[3]] };
    }
    setState(e) {
      let { buffer: t, state: n } = e, i = this._state, s;
      for (this._dataLength = e.length, this._bufferLength = e.buflen, i[0] = n[0], i[1] = n[1], i[2] = n[2], i[3] = n[3], s = 0;s < t.length; s += 1)
        this._buffer8[s] = t.charCodeAt(s);
    }
    end(e = false) {
      let t = this._bufferLength, n = this._buffer8, i = this._buffer32, s = (t >> 2) + 1;
      this._dataLength += t;
      let o = this._dataLength * 8;
      if (n[t] = 128, n[t + 1] = n[t + 2] = n[t + 3] = 0, i.set(M2.buffer32Identity.subarray(s), s), t > 55 && (M2._md5cycle(this._state, i), i.set(M2.buffer32Identity)), o <= 4294967295)
        i[14] = o;
      else {
        let u = o.toString(16).match(/(.*?)(.{0,8})$/);
        if (u === null)
          return;
        let c = parseInt(u[2], 16), l = parseInt(u[1], 16) || 0;
        i[14] = c, i[15] = l;
      }
      return M2._md5cycle(this._state, i), e ? this._state : M2._hex(this._state);
    }
  };
  a(M, "Md5"), E(M, "stateIdentity", new Int32Array([1732584193, -271733879, -1732584194, 271733878])), E(M, "buffer32Identity", new Int32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), E(M, "hexChars", "0123456789abcdef"), E(M, "hexOut", []), E(M, "onePassHasher", new M);
  et = M;
});
var lr = {};
se(lr, { createHash: () => Pu, createHmac: () => Ru, randomBytes: () => Iu });
function Iu(r) {
  return crypto.getRandomValues(p.alloc(r));
}
function Pu(r) {
  if (r === "sha256")
    return { update: a(function(e) {
      return { digest: a(function() {
        return p.from(Xe(e));
      }, "digest") };
    }, "update") };
  if (r === "md5")
    return { update: a(function(e) {
      return {
        digest: a(function() {
          return typeof e == "string" ? et.hashStr(e) : et.hashByteArray(e);
        }, "digest")
      };
    }, "update") };
  throw new Error(`Hash type '${r}' not supported`);
}
function Ru(r, e) {
  if (r !== "sha256")
    throw new Error(`Only sha256 is supported (requested: '${r}')`);
  return { update: a(function(t) {
    return { digest: a(function() {
      typeof e == "string" && (e = new TextEncoder().encode(e)), typeof t == "string" && (t = new TextEncoder().encode(t));
      let n = e.length;
      if (n > 64)
        e = Xe(e);
      else if (n < 64) {
        let c = new Uint8Array(64);
        c.set(e), e = c;
      }
      let i = new Uint8Array(64), s = new Uint8Array(64);
      for (let c = 0;c < 64; c++)
        i[c] = 54 ^ e[c], s[c] = 92 ^ e[c];
      let o = new Uint8Array(t.length + 64);
      o.set(i, 0), o.set(t, 64);
      let u = new Uint8Array(96);
      return u.set(s, 0), u.set(Xe(o), 64), p.from(Xe(u));
    }, "digest") };
  }, "update") };
}
var fr = V(() => {
  h();
  os();
  as();
  a(Iu, "randomBytes");
  a(Pu, "createHash");
  a(Ru, "createHmac");
});
var tt = T((vh, hr) => {
  h();
  hr.exports = {
    host: "localhost",
    user: y.platform === "win32" ? y.env.USERNAME : y.env.USER,
    database: undefined,
    password: null,
    connectionString: undefined,
    port: 5432,
    rows: 0,
    binary: false,
    max: 10,
    idleTimeoutMillis: 30000,
    client_encoding: "",
    ssl: false,
    application_name: undefined,
    fallback_application_name: undefined,
    options: undefined,
    parseInputDatesAsUTC: false,
    statement_timeout: false,
    lock_timeout: false,
    idle_in_transaction_session_timeout: false,
    query_timeout: false,
    connect_timeout: 0,
    keepalives: 1,
    keepalives_idle: 0
  };
  var ke = Je(), Lu = ke.getTypeParser(20, "text"), Bu = ke.getTypeParser(1016, "text");
  hr.exports.__defineSetter__("parseInt8", function(r) {
    ke.setTypeParser(20, "text", r ? ke.getTypeParser(23, "text") : Lu), ke.setTypeParser(1016, "text", r ? ke.getTypeParser(1007, "text") : Bu);
  });
});
var rt = T((Eh, cs) => {
  h();
  var Fu = (fr(), O(lr)), Mu = tt();
  function ku(r) {
    var e = r.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
    return '"' + e + '"';
  }
  a(ku, "escapeElement");
  function us(r) {
    for (var e = "{", t = 0;t < r.length; t++)
      t > 0 && (e = e + ","), r[t] === null || typeof r[t] > "u" ? e = e + "NULL" : Array.isArray(r[t]) ? e = e + us(r[t]) : r[t] instanceof p ? e += "\\\\x" + r[t].toString("hex") : e += ku(Tt(r[t]));
    return e = e + "}", e;
  }
  a(us, "arrayString");
  var Tt = a(function(r, e) {
    if (r == null)
      return null;
    if (r instanceof p)
      return r;
    if (ArrayBuffer.isView(r)) {
      var t = p.from(r.buffer, r.byteOffset, r.byteLength);
      return t.length === r.byteLength ? t : t.slice(r.byteOffset, r.byteOffset + r.byteLength);
    }
    return r instanceof Date ? Mu.parseInputDatesAsUTC ? Qu(r) : Uu(r) : Array.isArray(r) ? us(r) : typeof r == "object" ? Ou(r, e) : r.toString();
  }, "prepareValue");
  function Ou(r, e) {
    if (r && typeof r.toPostgres == "function") {
      if (e = e || [], e.indexOf(r) !== -1)
        throw new Error('circular reference detected while preparing "' + r + '" for query');
      return e.push(r), Tt(r.toPostgres(Tt), e);
    }
    return JSON.stringify(r);
  }
  a(Ou, "prepareObject");
  function W(r, e) {
    for (r = "" + r;r.length < e; )
      r = "0" + r;
    return r;
  }
  a(W, "pad");
  function Uu(r) {
    var e = -r.getTimezoneOffset(), t = r.getFullYear(), n = t < 1;
    n && (t = Math.abs(t) + 1);
    var i = W(t, 4) + "-" + W(r.getMonth() + 1, 2) + "-" + W(r.getDate(), 2) + "T" + W(r.getHours(), 2) + ":" + W(r.getMinutes(), 2) + ":" + W(r.getSeconds(), 2) + "." + W(r.getMilliseconds(), 3);
    return e < 0 ? (i += "-", e *= -1) : i += "+", i += W(Math.floor(e / 60), 2) + ":" + W(e % 60, 2), n && (i += " BC"), i;
  }
  a(Uu, "dateToString");
  function Qu(r) {
    var e = r.getUTCFullYear(), t = e < 1;
    t && (e = Math.abs(e) + 1);
    var n = W(e, 4) + "-" + W(r.getUTCMonth() + 1, 2) + "-" + W(r.getUTCDate(), 2) + "T" + W(r.getUTCHours(), 2) + ":" + W(r.getUTCMinutes(), 2) + ":" + W(r.getUTCSeconds(), 2) + "." + W(r.getUTCMilliseconds(), 3);
    return n += "+00:00", t && (n += " BC"), n;
  }
  a(Qu, "dateToStringUTC");
  function Du(r, e, t) {
    return r = typeof r == "string" ? { text: r } : r, e && (typeof e == "function" ? r.callback = e : r.values = e), t && (r.callback = t), r;
  }
  a(Du, "normalizeQueryConfig");
  var dr = a(function(r) {
    return Fu.createHash("md5").update(r, "utf-8").digest("hex");
  }, "md5"), qu = a(function(r, e, t) {
    var n = dr(e + r), i = dr(p.concat([p.from(n), t]));
    return "md5" + i;
  }, "postgresMd5PasswordHash");
  cs.exports = {
    prepareValue: a(function(e) {
      return Tt(e);
    }, "prepareValueWrapper"),
    normalizeQueryConfig: Du,
    postgresMd5PasswordHash: qu,
    md5: dr
  };
});
var nt = {};
se(nt, { default: () => ju });
var ju;
var it = V(() => {
  h();
  ju = {};
});
var xs = T((Dh, bs) => {
  h();
  var pr = (fr(), O(lr));
  function Hu(r) {
    if (r.indexOf("SCRAM-SHA-256") === -1)
      throw new Error("SASL: Only mechanism SCRAM-SHA-256 is currently supported");
    let e = pr.randomBytes(18).toString("base64");
    return { mechanism: "SCRAM-SHA-256", clientNonce: e, response: "n,,n=*,r=" + e, message: "SASLInitialResponse" };
  }
  a(Hu, "startSession");
  function $u(r, e, t) {
    if (r.message !== "SASLInitialResponse")
      throw new Error("SASL: Last message was not SASLInitialResponse");
    if (typeof e != "string")
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string");
    if (typeof t != "string")
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string");
    let n = zu(t);
    if (n.nonce.startsWith(r.clientNonce)) {
      if (n.nonce.length === r.clientNonce.length)
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
    } else
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
    var i = p.from(n.salt, "base64"), s = Zu(e, i, n.iteration), o = Oe(s, "Client Key"), u = Yu(o), c = "n=*,r=" + r.clientNonce, l = "r=" + n.nonce + ",s=" + n.salt + ",i=" + n.iteration, f = "c=biws,r=" + n.nonce, m = c + "," + l + "," + f, g = Oe(u, m), w = ws(o, g), S = w.toString("base64"), k = Oe(s, "Server Key"), D = Oe(k, m);
    r.message = "SASLResponse", r.serverSignature = D.toString("base64"), r.response = f + ",p=" + S;
  }
  a($u, "continueSession");
  function Gu(r, e) {
    if (r.message !== "SASLResponse")
      throw new Error("SASL: Last message was not SASLResponse");
    if (typeof e != "string")
      throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string");
    let { serverSignature: t } = Ku(e);
    if (t !== r.serverSignature)
      throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match");
  }
  a(Gu, "finalizeSession");
  function Vu(r) {
    if (typeof r != "string")
      throw new TypeError("SASL: text must be a string");
    return r.split("").map((e, t) => r.charCodeAt(t)).every((e) => e >= 33 && e <= 43 || e >= 45 && e <= 126);
  }
  a(Vu, "isPrintableChars");
  function ms(r) {
    return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(r);
  }
  a(ms, "isBase64");
  function gs(r) {
    if (typeof r != "string")
      throw new TypeError("SASL: attribute pairs text must be a string");
    return new Map(r.split(",").map((e) => {
      if (!/^.=/.test(e))
        throw new Error("SASL: Invalid attribute pair entry");
      let t = e[0], n = e.substring(2);
      return [t, n];
    }));
  }
  a(gs, "parseAttributePairs");
  function zu(r) {
    let e = gs(r), t = e.get("r");
    if (t) {
      if (!Vu(t))
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters");
    } else
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing");
    let n = e.get("s");
    if (n) {
      if (!ms(n))
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64");
    } else
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing");
    let i = e.get("i");
    if (i) {
      if (!/^[1-9][0-9]*$/.test(i))
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count");
    } else
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing");
    let s = parseInt(i, 10);
    return { nonce: t, salt: n, iteration: s };
  }
  a(zu, "parseServerFirstMessage");
  function Ku(r) {
    let t = gs(r).get("v");
    if (t) {
      if (!ms(t))
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64");
    } else
      throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing");
    return { serverSignature: t };
  }
  a(Ku, "parseServerFinalMessage");
  function ws(r, e) {
    if (!p.isBuffer(r))
      throw new TypeError("first argument must be a Buffer");
    if (!p.isBuffer(e))
      throw new TypeError("second argument must be a Buffer");
    if (r.length !== e.length)
      throw new Error("Buffer lengths must match");
    if (r.length === 0)
      throw new Error("Buffers cannot be empty");
    return p.from(r.map((t, n) => r[n] ^ e[n]));
  }
  a(ws, "xorBuffers");
  function Yu(r) {
    return pr.createHash("sha256").update(r).digest();
  }
  a(Yu, "sha256");
  function Oe(r, e) {
    return pr.createHmac("sha256", r).update(e).digest();
  }
  a(Oe, "hmacSha256");
  function Zu(r, e, t) {
    for (var n = Oe(r, p.concat([e, p.from([0, 0, 0, 1])])), i = n, s = 0;s < t - 1; s++)
      n = Oe(r, n), i = ws(i, n);
    return i;
  }
  a(Zu, "Hi");
  bs.exports = { startSession: Hu, continueSession: $u, finalizeSession: Gu };
});
var yr = {};
se(yr, { join: () => Ju });
function Ju(...r) {
  return r.join("/");
}
var mr = V(() => {
  h();
  a(Ju, "join");
});
var gr = {};
se(gr, { stat: () => Xu });
function Xu(r, e) {
  e(new Error("No filesystem"));
}
var wr = V(() => {
  h();
  a(Xu, "stat");
});
var br = {};
se(br, { default: () => ec });
var ec;
var xr = V(() => {
  h();
  ec = {};
});
var vs = {};
se(vs, { StringDecoder: () => vr });
var Sr;
var vr;
var Ss = V(() => {
  h();
  Sr = class Sr2 {
    constructor(e) {
      E(this, "td");
      this.td = new TextDecoder(e);
    }
    write(e) {
      return this.td.decode(e, { stream: true });
    }
    end(e) {
      return this.td.decode(e);
    }
  };
  a(Sr, "StringDecoder");
  vr = Sr;
});
var _s = T((Kh, Cs) => {
  h();
  var { Transform: tc } = (xr(), O(br)), { StringDecoder: rc } = (Ss(), O(vs)), Se = Symbol("last"), It = Symbol("decoder");
  function nc(r, e, t) {
    let n;
    if (this.overflow) {
      if (n = this[It].write(r).split(this.matcher), n.length === 1)
        return t();
      n.shift(), this.overflow = false;
    } else
      this[Se] += this[It].write(r), n = this[Se].split(this.matcher);
    this[Se] = n.pop();
    for (let i = 0;i < n.length; i++)
      try {
        As(this, this.mapper(n[i]));
      } catch (s) {
        return t(s);
      }
    if (this.overflow = this[Se].length > this.maxLength, this.overflow && !this.skipOverflow) {
      t(new Error("maximum buffer reached"));
      return;
    }
    t();
  }
  a(nc, "transform");
  function ic(r) {
    if (this[Se] += this[It].end(), this[Se])
      try {
        As(this, this.mapper(this[Se]));
      } catch (e) {
        return r(e);
      }
    r();
  }
  a(ic, "flush");
  function As(r, e) {
    e !== undefined && r.push(e);
  }
  a(As, "push");
  function Es(r) {
    return r;
  }
  a(Es, "noop");
  function sc(r, e, t) {
    switch (r = r || /\r?\n/, e = e || Es, t = t || {}, arguments.length) {
      case 1:
        typeof r == "function" ? (e = r, r = /\r?\n/) : typeof r == "object" && !(r instanceof RegExp) && !r[Symbol.split] && (t = r, r = /\r?\n/);
        break;
      case 2:
        typeof r == "function" ? (t = e, e = r, r = /\r?\n/) : typeof e == "object" && (t = e, e = Es);
    }
    t = Object.assign({}, t), t.autoDestroy = true, t.transform = nc, t.flush = ic, t.readableObjectMode = true;
    let n = new tc(t);
    return n[Se] = "", n[It] = new rc("utf8"), n.matcher = r, n.mapper = e, n.maxLength = t.maxLength, n.skipOverflow = t.skipOverflow || false, n.overflow = false, n._destroy = function(i, s) {
      this._writableState.errorEmitted = false, s(i);
    }, n;
  }
  a(sc, "split");
  Cs.exports = sc;
});
var Ps = T((Jh, ye) => {
  h();
  var Ts = (mr(), O(yr)), oc = (xr(), O(br)).Stream, ac = _s(), Is = (it(), O(nt)), uc = 5432, Pt = y.platform === "win32", st = y.stderr, cc = 56, lc = 7, fc = 61440, hc = 32768;
  function dc(r) {
    return (r & fc) == hc;
  }
  a(dc, "isRegFile");
  var Ue = ["host", "port", "database", "user", "password"], Er = Ue.length, pc = Ue[Er - 1];
  function Ar() {
    var r = st instanceof oc && st.writable === true;
    if (r) {
      var e = Array.prototype.slice.call(arguments).concat(`
`);
      st.write(Is.format.apply(Is, e));
    }
  }
  a(Ar, "warn");
  Object.defineProperty(ye.exports, "isWin", { get: a(function() {
    return Pt;
  }, "get"), set: a(function(r) {
    Pt = r;
  }, "set") });
  ye.exports.warnTo = function(r) {
    var e = st;
    return st = r, e;
  };
  ye.exports.getFileName = function(r) {
    var e = r || y.env, t = e.PGPASSFILE || (Pt ? Ts.join(e.APPDATA || "./", "postgresql", "pgpass.conf") : Ts.join(e.HOME || "./", ".pgpass"));
    return t;
  };
  ye.exports.usePgPass = function(r, e) {
    return Object.prototype.hasOwnProperty.call(y.env, "PGPASSWORD") ? false : Pt ? true : (e = e || "<unkn>", dc(r.mode) ? r.mode & (cc | lc) ? (Ar('WARNING: password file "%s" has group or world access; permissions should be u=rw (0600) or less', e), false) : true : (Ar('WARNING: password file "%s" is not a plain file', e), false));
  };
  var yc = ye.exports.match = function(r, e) {
    return Ue.slice(0, -1).reduce(function(t, n, i) {
      return i == 1 && Number(r[n] || uc) === Number(e[n]) ? t && true : t && (e[n] === "*" || e[n] === r[n]);
    }, true);
  };
  ye.exports.getPassword = function(r, e, t) {
    var n, i = e.pipe(ac());
    function s(c) {
      var l = mc(c);
      l && gc(l) && yc(r, l) && (n = l[pc], i.end());
    }
    a(s, "onLine");
    var o = a(function() {
      e.destroy(), t(n);
    }, "onEnd"), u = a(function(c) {
      e.destroy(), Ar("WARNING: error on reading file: %s", c), t(undefined);
    }, "onErr");
    e.on("error", u), i.on("data", s).on("end", o).on("error", u);
  };
  var mc = ye.exports.parseLine = function(r) {
    if (r.length < 11 || r.match(/^\s+#/))
      return null;
    for (var e = "", t = "", n = 0, i = 0, s = 0, o = {}, u = false, c = a(function(f, m, g) {
      var w = r.substring(m, g);
      Object.hasOwnProperty.call(y.env, "PGPASS_NO_DEESCAPE") || (w = w.replace(/\\([:\\])/g, "$1")), o[Ue[f]] = w;
    }, "addToObj"), l = 0;l < r.length - 1; l += 1) {
      if (e = r.charAt(l + 1), t = r.charAt(l), u = n == Er - 1, u) {
        c(n, i);
        break;
      }
      l >= 0 && e == ":" && t !== "\\" && (c(n, i, l + 1), i = l + 2, n += 1);
    }
    return o = Object.keys(o).length === Er ? o : null, o;
  }, gc = ye.exports.isValidEntry = function(r) {
    for (var e = { 0: function(o) {
      return o.length > 0;
    }, 1: function(o) {
      return o === "*" ? true : (o = Number(o), isFinite(o) && o > 0 && o < 9007199254740992 && Math.floor(o) === o);
    }, 2: function(o) {
      return o.length > 0;
    }, 3: function(o) {
      return o.length > 0;
    }, 4: function(o) {
      return o.length > 0;
    } }, t = 0;t < Ue.length; t += 1) {
      var n = e[t], i = r[Ue[t]] || "", s = n(i);
      if (!s)
        return false;
    }
    return true;
  };
});
var Ls = T((rd, Cr) => {
  h();
  var td = (mr(), O(yr)), Rs = (wr(), O(gr)), Rt = Ps();
  Cr.exports = function(r, e) {
    var t = Rt.getFileName();
    Rs.stat(t, function(n, i) {
      if (n || !Rt.usePgPass(i, t))
        return e(undefined);
      var s = Rs.createReadStream(t);
      Rt.getPassword(r, s, e);
    });
  };
  Cr.exports.warnTo = Rt.warnTo;
});
var Bs = {};
se(Bs, { default: () => wc });
var wc;
var Fs = V(() => {
  h();
  wc = {};
});
var Ms = {};
se(Ms, { parse: () => bc });
function bc(r, e = false) {
  let { protocol: t } = new URL(r), n = "http:" + r.substring(t.length), { username: i, password: s, host: o, hostname: u, port: c, pathname: l, search: f, searchParams: m, hash: g } = new URL(n);
  s = decodeURIComponent(s), i = decodeURIComponent(i), l = decodeURIComponent(l);
  let w = i + ":" + s, S = e ? Object.fromEntries(m.entries()) : f;
  return {
    href: r,
    protocol: t,
    auth: w,
    username: i,
    password: s,
    host: o,
    hostname: u,
    port: c,
    pathname: l,
    search: f,
    query: S,
    hash: g
  };
}
var ks = V(() => {
  h();
  a(bc, "parse");
});
var Ir = T((ad, Os) => {
  h();
  var xc = (ks(), O(Ms)), _r = (wr(), O(gr));
  function Tr(r) {
    if (r.charAt(0) === "/") {
      var t = r.split(" ");
      return { host: t[0], database: t[1] };
    }
    var e = xc.parse(/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(r) ? encodeURI(r).replace(/\%25(\d\d)/g, "%$1") : r, true), t = e.query;
    for (var n in t)
      Array.isArray(t[n]) && (t[n] = t[n][t[n].length - 1]);
    var i = (e.auth || ":").split(":");
    if (t.user = i[0], t.password = i.splice(1).join(":"), t.port = e.port, e.protocol == "socket:")
      return t.host = decodeURI(e.pathname), t.database = e.query.db, t.client_encoding = e.query.encoding, t;
    t.host || (t.host = e.hostname);
    var s = e.pathname;
    if (!t.host && s && /^%2f/i.test(s)) {
      var o = s.split("/");
      t.host = decodeURIComponent(o[0]), s = o.splice(1).join("/");
    }
    switch (s && s.charAt(0) === "/" && (s = s.slice(1) || null), t.database = s && decodeURI(s), (t.ssl === "true" || t.ssl === "1") && (t.ssl = true), t.ssl === "0" && (t.ssl = false), (t.sslcert || t.sslkey || t.sslrootcert || t.sslmode) && (t.ssl = {}), t.sslcert && (t.ssl.cert = _r.readFileSync(t.sslcert).toString()), t.sslkey && (t.ssl.key = _r.readFileSync(t.sslkey).toString()), t.sslrootcert && (t.ssl.ca = _r.readFileSync(t.sslrootcert).toString()), t.sslmode) {
      case "disable": {
        t.ssl = false;
        break;
      }
      case "prefer":
      case "require":
      case "verify-ca":
      case "verify-full":
        break;
      case "no-verify": {
        t.ssl.rejectUnauthorized = false;
        break;
      }
    }
    return t;
  }
  a(Tr, "parse");
  Os.exports = Tr;
  Tr.parse = Tr;
});
var Lt = T((ld, Ds) => {
  h();
  var vc = (Fs(), O(Bs)), Qs = tt(), Us = Ir().parse, j = a(function(r, e, t) {
    return t === undefined ? t = y.env["PG" + r.toUpperCase()] : t === false || (t = y.env[t]), e[r] || t || Qs[r];
  }, "val"), Sc = a(function() {
    switch (y.env.PGSSLMODE) {
      case "disable":
        return false;
      case "prefer":
      case "require":
      case "verify-ca":
      case "verify-full":
        return true;
      case "no-verify":
        return { rejectUnauthorized: false };
    }
    return Qs.ssl;
  }, "readSSLConfigFromEnvironment"), Qe = a(function(r) {
    return "'" + ("" + r).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
  }, "quoteParamValue"), te = a(function(r, e, t) {
    var n = e[t];
    n != null && r.push(t + "=" + Qe(n));
  }, "add"), Rr = class Rr2 {
    constructor(e) {
      e = typeof e == "string" ? Us(e) : e || {}, e.connectionString && (e = Object.assign({}, e, Us(e.connectionString))), this.user = j("user", e), this.database = j("database", e), this.database === undefined && (this.database = this.user), this.port = parseInt(j("port", e), 10), this.host = j("host", e), Object.defineProperty(this, "password", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: j("password", e)
      }), this.binary = j("binary", e), this.options = j("options", e), this.ssl = typeof e.ssl > "u" ? Sc() : e.ssl, typeof this.ssl == "string" && this.ssl === "true" && (this.ssl = true), this.ssl === "no-verify" && (this.ssl = { rejectUnauthorized: false }), this.ssl && this.ssl.key && Object.defineProperty(this.ssl, "key", { enumerable: false }), this.client_encoding = j("client_encoding", e), this.replication = j("replication", e), this.isDomainSocket = !(this.host || "").indexOf("/"), this.application_name = j("application_name", e, "PGAPPNAME"), this.fallback_application_name = j("fallback_application_name", e, false), this.statement_timeout = j("statement_timeout", e, false), this.lock_timeout = j("lock_timeout", e, false), this.idle_in_transaction_session_timeout = j("idle_in_transaction_session_timeout", e, false), this.query_timeout = j("query_timeout", e, false), e.connectionTimeoutMillis === undefined ? this.connect_timeout = y.env.PGCONNECT_TIMEOUT || 0 : this.connect_timeout = Math.floor(e.connectionTimeoutMillis / 1000), e.keepAlive === false ? this.keepalives = 0 : e.keepAlive === true && (this.keepalives = 1), typeof e.keepAliveInitialDelayMillis == "number" && (this.keepalives_idle = Math.floor(e.keepAliveInitialDelayMillis / 1000));
    }
    getLibpqConnectionString(e) {
      var t = [];
      te(t, this, "user"), te(t, this, "password"), te(t, this, "port"), te(t, this, "application_name"), te(t, this, "fallback_application_name"), te(t, this, "connect_timeout"), te(t, this, "options");
      var n = typeof this.ssl == "object" ? this.ssl : this.ssl ? { sslmode: this.ssl } : {};
      if (te(t, n, "sslmode"), te(t, n, "sslca"), te(t, n, "sslkey"), te(t, n, "sslcert"), te(t, n, "sslrootcert"), this.database && t.push("dbname=" + Qe(this.database)), this.replication && t.push("replication=" + Qe(this.replication)), this.host && t.push("host=" + Qe(this.host)), this.isDomainSocket)
        return e(null, t.join(" "));
      this.client_encoding && t.push("client_encoding=" + Qe(this.client_encoding)), vc.lookup(this.host, function(i, s) {
        return i ? e(i, null) : (t.push("hostaddr=" + Qe(s)), e(null, t.join(" ")));
      });
    }
  };
  a(Rr, "ConnectionParameters");
  var Pr = Rr;
  Ds.exports = Pr;
});
var Ws = T((dd, Ns) => {
  h();
  var Ec = Je(), qs = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/, Br = class Br2 {
    constructor(e, t) {
      this.command = null, this.rowCount = null, this.oid = null, this.rows = [], this.fields = [], this._parsers = undefined, this._types = t, this.RowCtor = null, this.rowAsArray = e === "array", this.rowAsArray && (this.parseRow = this._parseRowAsArray);
    }
    addCommandComplete(e) {
      var t;
      e.text ? t = qs.exec(e.text) : t = qs.exec(e.command), t && (this.command = t[1], t[3] ? (this.oid = parseInt(t[2], 10), this.rowCount = parseInt(t[3], 10)) : t[2] && (this.rowCount = parseInt(t[2], 10)));
    }
    _parseRowAsArray(e) {
      for (var t = new Array(e.length), n = 0, i = e.length;n < i; n++) {
        var s = e[n];
        s !== null ? t[n] = this._parsers[n](s) : t[n] = null;
      }
      return t;
    }
    parseRow(e) {
      for (var t = {}, n = 0, i = e.length;n < i; n++) {
        var s = e[n], o = this.fields[n].name;
        s !== null ? t[o] = this._parsers[n](s) : t[o] = null;
      }
      return t;
    }
    addRow(e) {
      this.rows.push(e);
    }
    addFields(e) {
      this.fields = e, this.fields.length && (this._parsers = new Array(e.length));
      for (var t = 0;t < e.length; t++) {
        var n = e[t];
        this._types ? this._parsers[t] = this._types.getTypeParser(n.dataTypeID, n.format || "text") : this._parsers[t] = Ec.getTypeParser(n.dataTypeID, n.format || "text");
      }
    }
  };
  a(Br, "Result");
  var Lr = Br;
  Ns.exports = Lr;
});
var Gs = T((md, $s) => {
  h();
  var { EventEmitter: Ac } = ve(), js = Ws(), Hs = rt(), Mr = class Mr2 extends Ac {
    constructor(e, t, n) {
      super(), e = Hs.normalizeQueryConfig(e, t, n), this.text = e.text, this.values = e.values, this.rows = e.rows, this.types = e.types, this.name = e.name, this.binary = e.binary, this.portal = e.portal || "", this.callback = e.callback, this._rowMode = e.rowMode, y.domain && e.callback && (this.callback = y.domain.bind(e.callback)), this._result = new js(this._rowMode, this.types), this._results = this._result, this.isPreparedStatement = false, this._canceledDueToError = false, this._promise = null;
    }
    requiresPreparation() {
      return this.name || this.rows ? true : !this.text || !this.values ? false : this.values.length > 0;
    }
    _checkForMultirow() {
      this._result.command && (Array.isArray(this._results) || (this._results = [this._result]), this._result = new js(this._rowMode, this.types), this._results.push(this._result));
    }
    handleRowDescription(e) {
      this._checkForMultirow(), this._result.addFields(e.fields), this._accumulateRows = this.callback || !this.listeners("row").length;
    }
    handleDataRow(e) {
      let t;
      if (!this._canceledDueToError) {
        try {
          t = this._result.parseRow(e.fields);
        } catch (n) {
          this._canceledDueToError = n;
          return;
        }
        this.emit("row", t, this._result), this._accumulateRows && this._result.addRow(t);
      }
    }
    handleCommandComplete(e, t) {
      this._checkForMultirow(), this._result.addCommandComplete(e), this.rows && t.sync();
    }
    handleEmptyQuery(e) {
      this.rows && e.sync();
    }
    handleError(e, t) {
      if (this._canceledDueToError && (e = this._canceledDueToError, this._canceledDueToError = false), this.callback)
        return this.callback(e);
      this.emit("error", e);
    }
    handleReadyForQuery(e) {
      if (this._canceledDueToError)
        return this.handleError(this._canceledDueToError, e);
      if (this.callback)
        try {
          this.callback(null, this._results);
        } catch (t) {
          y.nextTick(() => {
            throw t;
          });
        }
      this.emit("end", this._results);
    }
    submit(e) {
      if (typeof this.text != "string" && typeof this.name != "string")
        return new Error("A query must have either text or a name. Supplying neither is unsupported.");
      let t = e.parsedStatements[this.name];
      return this.text && t && this.text !== t ? new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`) : this.values && !Array.isArray(this.values) ? new Error("Query values must be an array") : (this.requiresPreparation() ? this.prepare(e) : e.query(this.text), null);
    }
    hasBeenParsed(e) {
      return this.name && e.parsedStatements[this.name];
    }
    handlePortalSuspended(e) {
      this._getRows(e, this.rows);
    }
    _getRows(e, t) {
      e.execute({ portal: this.portal, rows: t }), t ? e.flush() : e.sync();
    }
    prepare(e) {
      this.isPreparedStatement = true, this.hasBeenParsed(e) || e.parse({ text: this.text, name: this.name, types: this.types });
      try {
        e.bind({ portal: this.portal, statement: this.name, values: this.values, binary: this.binary, valueMapper: Hs.prepareValue });
      } catch (t) {
        this.handleError(t, e);
        return;
      }
      e.describe({ type: "P", name: this.portal || "" }), this._getRows(e, this.rows);
    }
    handleCopyInResponse(e) {
      e.sendCopyFail("No source stream defined");
    }
    handleCopyData(e, t) {}
  };
  a(Mr, "Query");
  var Fr = Mr;
  $s.exports = Fr;
});
var ln = T((_) => {
  h();
  Object.defineProperty(_, "__esModule", { value: true });
  _.NoticeMessage = _.DataRowMessage = _.CommandCompleteMessage = _.ReadyForQueryMessage = _.NotificationResponseMessage = _.BackendKeyDataMessage = _.AuthenticationMD5Password = _.ParameterStatusMessage = _.ParameterDescriptionMessage = _.RowDescriptionMessage = _.Field = _.CopyResponse = _.CopyDataMessage = _.DatabaseError = _.copyDone = _.emptyQuery = _.replicationStart = _.portalSuspended = _.noData = _.closeComplete = _.bindComplete = _.parseComplete = undefined;
  _.parseComplete = { name: "parseComplete", length: 5 };
  _.bindComplete = { name: "bindComplete", length: 5 };
  _.closeComplete = { name: "closeComplete", length: 5 };
  _.noData = { name: "noData", length: 5 };
  _.portalSuspended = { name: "portalSuspended", length: 5 };
  _.replicationStart = { name: "replicationStart", length: 4 };
  _.emptyQuery = { name: "emptyQuery", length: 4 };
  _.copyDone = { name: "copyDone", length: 4 };
  var Kr = class Kr2 extends Error {
    constructor(e, t, n) {
      super(e), this.length = t, this.name = n;
    }
  };
  a(Kr, "DatabaseError");
  var kr = Kr;
  _.DatabaseError = kr;
  var Yr = class Yr2 {
    constructor(e, t) {
      this.length = e, this.chunk = t, this.name = "copyData";
    }
  };
  a(Yr, "CopyDataMessage");
  var Or = Yr;
  _.CopyDataMessage = Or;
  var Zr = class Zr2 {
    constructor(e, t, n, i) {
      this.length = e, this.name = t, this.binary = n, this.columnTypes = new Array(i);
    }
  };
  a(Zr, "CopyResponse");
  var Ur = Zr;
  _.CopyResponse = Ur;
  var Jr = class Jr2 {
    constructor(e, t, n, i, s, o, u) {
      this.name = e, this.tableID = t, this.columnID = n, this.dataTypeID = i, this.dataTypeSize = s, this.dataTypeModifier = o, this.format = u;
    }
  };
  a(Jr, "Field");
  var Qr = Jr;
  _.Field = Qr;
  var Xr = class Xr2 {
    constructor(e, t) {
      this.length = e, this.fieldCount = t, this.name = "rowDescription", this.fields = new Array(this.fieldCount);
    }
  };
  a(Xr, "RowDescriptionMessage");
  var Dr = Xr;
  _.RowDescriptionMessage = Dr;
  var en = class en2 {
    constructor(e, t) {
      this.length = e, this.parameterCount = t, this.name = "parameterDescription", this.dataTypeIDs = new Array(this.parameterCount);
    }
  };
  a(en, "ParameterDescriptionMessage");
  var qr = en;
  _.ParameterDescriptionMessage = qr;
  var tn = class tn2 {
    constructor(e, t, n) {
      this.length = e, this.parameterName = t, this.parameterValue = n, this.name = "parameterStatus";
    }
  };
  a(tn, "ParameterStatusMessage");
  var Nr = tn;
  _.ParameterStatusMessage = Nr;
  var rn = class rn2 {
    constructor(e, t) {
      this.length = e, this.salt = t, this.name = "authenticationMD5Password";
    }
  };
  a(rn, "AuthenticationMD5Password");
  var Wr = rn;
  _.AuthenticationMD5Password = Wr;
  var nn = class nn2 {
    constructor(e, t, n) {
      this.length = e, this.processID = t, this.secretKey = n, this.name = "backendKeyData";
    }
  };
  a(nn, "BackendKeyDataMessage");
  var jr = nn;
  _.BackendKeyDataMessage = jr;
  var sn = class sn2 {
    constructor(e, t, n, i) {
      this.length = e, this.processId = t, this.channel = n, this.payload = i, this.name = "notification";
    }
  };
  a(sn, "NotificationResponseMessage");
  var Hr = sn;
  _.NotificationResponseMessage = Hr;
  var on = class on2 {
    constructor(e, t) {
      this.length = e, this.status = t, this.name = "readyForQuery";
    }
  };
  a(on, "ReadyForQueryMessage");
  var $r = on;
  _.ReadyForQueryMessage = $r;
  var an = class an2 {
    constructor(e, t) {
      this.length = e, this.text = t, this.name = "commandComplete";
    }
  };
  a(an, "CommandCompleteMessage");
  var Gr = an;
  _.CommandCompleteMessage = Gr;
  var un = class un2 {
    constructor(e, t) {
      this.length = e, this.fields = t, this.name = "dataRow", this.fieldCount = t.length;
    }
  };
  a(un, "DataRowMessage");
  var Vr = un;
  _.DataRowMessage = Vr;
  var cn = class cn2 {
    constructor(e, t) {
      this.length = e, this.message = t, this.name = "notice";
    }
  };
  a(cn, "NoticeMessage");
  var zr = cn;
  _.NoticeMessage = zr;
});
var Vs = T((Bt) => {
  h();
  Object.defineProperty(Bt, "__esModule", { value: true });
  Bt.Writer = undefined;
  var hn = class hn2 {
    constructor(e = 256) {
      this.size = e, this.offset = 5, this.headerPosition = 0, this.buffer = p.allocUnsafe(e);
    }
    ensure(e) {
      if (this.buffer.length - this.offset < e) {
        let n = this.buffer, i = n.length + (n.length >> 1) + e;
        this.buffer = p.allocUnsafe(i), n.copy(this.buffer);
      }
    }
    addInt32(e) {
      return this.ensure(4), this.buffer[this.offset++] = e >>> 24 & 255, this.buffer[this.offset++] = e >>> 16 & 255, this.buffer[this.offset++] = e >>> 8 & 255, this.buffer[this.offset++] = e >>> 0 & 255, this;
    }
    addInt16(e) {
      return this.ensure(2), this.buffer[this.offset++] = e >>> 8 & 255, this.buffer[this.offset++] = e >>> 0 & 255, this;
    }
    addCString(e) {
      if (!e)
        this.ensure(1);
      else {
        let t = p.byteLength(e);
        this.ensure(t + 1), this.buffer.write(e, this.offset, "utf-8"), this.offset += t;
      }
      return this.buffer[this.offset++] = 0, this;
    }
    addString(e = "") {
      let t = p.byteLength(e);
      return this.ensure(t), this.buffer.write(e, this.offset), this.offset += t, this;
    }
    addInt32PrefixedString(e) {
      let t = p.byteLength(e);
      this.ensure(4 + t);
      let n = this.buffer, i = this.offset;
      return n[i++] = t >>> 24 & 255, n[i++] = t >>> 16 & 255, n[i++] = t >>> 8 & 255, n[i++] = t >>> 0 & 255, n.write(e, i, "utf-8"), this.offset = i + t, this;
    }
    add(e) {
      return this.ensure(e.length), e.copy(this.buffer, this.offset), this.offset += e.length, this;
    }
    join(e) {
      if (e) {
        this.buffer[this.headerPosition] = e;
        let t = this.offset - (this.headerPosition + 1);
        this.buffer.writeInt32BE(t, this.headerPosition + 1);
      }
      return this.buffer.slice(e ? 0 : 5, this.offset);
    }
    flush(e) {
      let t = this.join(e);
      return this.offset = 5, this.headerPosition = 0, this.buffer = p.allocUnsafe(this.size), t;
    }
    clear() {
      this.offset = 5, this.headerPosition = 0;
    }
  };
  a(hn, "Writer");
  var fn = hn;
  Bt.Writer = fn;
});
var Ks = T((Mt) => {
  h();
  Object.defineProperty(Mt, "__esModule", { value: true });
  Mt.serialize = undefined;
  var dn = Vs(), L = new dn.Writer, Cc = a((r) => {
    L.addInt16(3).addInt16(0);
    for (let n of Object.keys(r))
      L.addCString(n).addCString(r[n]);
    L.addCString("client_encoding").addCString("UTF8");
    let e = L.addCString("").flush(), t = e.length + 4;
    return new dn.Writer().addInt32(t).add(e).flush();
  }, "startup"), _c = a(() => {
    let r = p.allocUnsafe(8);
    return r.writeInt32BE(8, 0), r.writeInt32BE(80877103, 4), r;
  }, "requestSsl"), Tc = a((r) => L.addCString(r).flush(112), "password"), Ic = a(function(r, e) {
    return L.addCString(r).addInt32PrefixedString(e), L.flush(112);
  }, "sendSASLInitialResponseMessage"), Pc = a(function(r) {
    return L.addString(r).flush(112);
  }, "sendSCRAMClientFinalMessage"), Rc = a((r) => L.addCString(r).flush(81), "query"), zs = [], Lc = a((r) => {
    let e = r.name || "";
    e.length > 63 && (console.error("Warning! Postgres only supports 63 characters for query names."), console.error("You supplied %s (%s)", e, e.length), console.error("This can cause conflicts and silent errors executing queries"));
    let t = r.types || zs, n = t.length, i = L.addCString(e).addCString(r.text).addInt16(n);
    for (let s = 0;s < n; s++)
      i.addInt32(t[s]);
    return L.flush(80);
  }, "parse"), De = new dn.Writer, Bc = a(function(r, e) {
    for (let t = 0;t < r.length; t++) {
      let n = e ? e(r[t], t) : r[t];
      n == null ? (L.addInt16(0), De.addInt32(-1)) : n instanceof p ? (L.addInt16(1), De.addInt32(n.length), De.add(n)) : (L.addInt16(0), De.addInt32PrefixedString(n));
    }
  }, "writeValues"), Fc = a((r = {}) => {
    let e = r.portal || "", t = r.statement || "", n = r.binary || false, i = r.values || zs, s = i.length;
    L.addCString(e).addCString(t), L.addInt16(s);
    try {
      Bc(i, r.valueMapper);
    } catch (o) {
      throw L.clear(), De.clear(), o;
    }
    return L.addInt16(s), L.add(De.flush()), L.addInt16(1), L.addInt16(n ? 1 : 0), L.flush(66);
  }, "bind"), Mc = p.from([
    69,
    0,
    0,
    0,
    9,
    0,
    0,
    0,
    0,
    0
  ]), kc = a((r) => {
    if (!r || !r.portal && !r.rows)
      return Mc;
    let e = r.portal || "", t = r.rows || 0, n = p.byteLength(e), i = 4 + n + 1 + 4, s = p.allocUnsafe(1 + i);
    return s[0] = 69, s.writeInt32BE(i, 1), s.write(e, 5, "utf-8"), s[n + 5] = 0, s.writeUInt32BE(t, s.length - 4), s;
  }, "execute"), Oc = a((r, e) => {
    let t = p.allocUnsafe(16);
    return t.writeInt32BE(16, 0), t.writeInt16BE(1234, 4), t.writeInt16BE(5678, 6), t.writeInt32BE(r, 8), t.writeInt32BE(e, 12), t;
  }, "cancel"), pn = a((r, e) => {
    let n = 4 + p.byteLength(e) + 1, i = p.allocUnsafe(1 + n);
    return i[0] = r, i.writeInt32BE(n, 1), i.write(e, 5, "utf-8"), i[n] = 0, i;
  }, "cstringMessage"), Uc = L.addCString("P").flush(68), Qc = L.addCString("S").flush(68), Dc = a((r) => r.name ? pn(68, `${r.type}${r.name || ""}`) : r.type === "P" ? Uc : Qc, "describe"), qc = a((r) => {
    let e = `${r.type}${r.name || ""}`;
    return pn(67, e);
  }, "close"), Nc = a((r) => L.add(r).flush(100), "copyData"), Wc = a((r) => pn(102, r), "copyFail"), Ft = a((r) => p.from([r, 0, 0, 0, 4]), "codeOnlyBuffer"), jc = Ft(72), Hc = Ft(83), $c = Ft(88), Gc = Ft(99), Vc = {
    startup: Cc,
    password: Tc,
    requestSsl: _c,
    sendSASLInitialResponseMessage: Ic,
    sendSCRAMClientFinalMessage: Pc,
    query: Rc,
    parse: Lc,
    bind: Fc,
    execute: kc,
    describe: Dc,
    close: qc,
    flush: a(() => jc, "flush"),
    sync: a(() => Hc, "sync"),
    end: a(() => $c, "end"),
    copyData: Nc,
    copyDone: a(() => Gc, "copyDone"),
    copyFail: Wc,
    cancel: Oc
  };
  Mt.serialize = Vc;
});
var Ys = T((kt) => {
  h();
  Object.defineProperty(kt, "__esModule", { value: true });
  kt.BufferReader = undefined;
  var mn = class mn2 {
    constructor(e = 0) {
      this.offset = e, this.buffer = p.allocUnsafe(0), this.encoding = "utf-8";
    }
    setBuffer(e, t) {
      this.offset = e, this.buffer = t;
    }
    int16() {
      let e = this.buffer.readInt16BE(this.offset);
      return this.offset += 2, e;
    }
    byte() {
      let e = this.buffer[this.offset];
      return this.offset++, e;
    }
    int32() {
      let e = this.buffer.readInt32BE(this.offset);
      return this.offset += 4, e;
    }
    uint32() {
      let e = this.buffer.readUInt32BE(this.offset);
      return this.offset += 4, e;
    }
    string(e) {
      let t = this.buffer.toString(this.encoding, this.offset, this.offset + e);
      return this.offset += e, t;
    }
    cstring() {
      let e = this.offset, t = e;
      for (;this.buffer[t++]; )
        ;
      return this.offset = t, this.buffer.toString(this.encoding, e, t - 1);
    }
    bytes(e) {
      let t = this.buffer.slice(this.offset, this.offset + e);
      return this.offset += e, t;
    }
  };
  a(mn, "BufferReader");
  var yn = mn;
  kt.BufferReader = yn;
});
var eo = T((Ot) => {
  h();
  Object.defineProperty(Ot, "__esModule", { value: true });
  Ot.Parser = undefined;
  var F = ln(), zc = Ys(), wn = 1, Kc = 4, Zs = wn + Kc, Z = -1, gn = p.allocUnsafe(0), xn = class xn2 {
    constructor(e) {
      if (this.buffer = gn, this.bufferLength = 0, this.bufferOffset = 0, this.reader = new zc.BufferReader, e?.mode === "binary")
        throw new Error("Binary mode not supported yet");
      this.mode = e?.mode || "text";
    }
    parse(e, t) {
      this.mergeBuffer(e);
      let n = this.bufferOffset + this.bufferLength, i = this.bufferOffset;
      for (;i + Zs <= n; ) {
        let s = this.buffer[i], o = this.buffer.readUInt32BE(i + wn), u = wn + o;
        if (u + i <= n) {
          let c = this.handlePacket(i + Zs, s, o, this.buffer);
          t(c), i += u;
        } else
          break;
      }
      i === n ? (this.buffer = gn, this.bufferLength = 0, this.bufferOffset = 0) : (this.bufferLength = n - i, this.bufferOffset = i);
    }
    mergeBuffer(e) {
      if (this.bufferLength > 0) {
        let t = this.bufferLength + e.byteLength;
        if (t + this.bufferOffset > this.buffer.byteLength) {
          let i;
          if (t <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength)
            i = this.buffer;
          else {
            let s = this.buffer.byteLength * 2;
            for (;t >= s; )
              s *= 2;
            i = p.allocUnsafe(s);
          }
          this.buffer.copy(i, 0, this.bufferOffset, this.bufferOffset + this.bufferLength), this.buffer = i, this.bufferOffset = 0;
        }
        e.copy(this.buffer, this.bufferOffset + this.bufferLength), this.bufferLength = t;
      } else
        this.buffer = e, this.bufferOffset = 0, this.bufferLength = e.byteLength;
    }
    handlePacket(e, t, n, i) {
      let { reader: s } = this;
      s.setBuffer(e, i);
      let o;
      switch (t) {
        case 50:
          o = F.bindComplete;
          break;
        case 49:
          o = F.parseComplete;
          break;
        case 51:
          o = F.closeComplete;
          break;
        case 110:
          o = F.noData;
          break;
        case 115:
          o = F.portalSuspended;
          break;
        case 99:
          o = F.copyDone;
          break;
        case 87:
          o = F.replicationStart;
          break;
        case 73:
          o = F.emptyQuery;
          break;
        case 68:
          o = sl(s);
          break;
        case 67:
          o = Zc(s);
          break;
        case 90:
          o = Yc(s);
          break;
        case 65:
          o = tl(s);
          break;
        case 82:
          o = ul(s, n);
          break;
        case 83:
          o = ol(s);
          break;
        case 75:
          o = al(s);
          break;
        case 69:
          o = Js(s, "error");
          break;
        case 78:
          o = Js(s, "notice");
          break;
        case 84:
          o = rl(s);
          break;
        case 116:
          o = il(s);
          break;
        case 71:
          o = Xc(s);
          break;
        case 72:
          o = el(s);
          break;
        case 100:
          o = Jc(s, n);
          break;
        default:
          return new F.DatabaseError("received invalid response: " + t.toString(16), n, "error");
      }
      return s.setBuffer(0, gn), o.length = n, o;
    }
  };
  a(xn, "Parser");
  var bn = xn;
  Ot.Parser = bn;
  var Yc = a((r) => {
    let e = r.string(1);
    return new F.ReadyForQueryMessage(Z, e);
  }, "parseReadyForQueryMessage"), Zc = a((r) => {
    let e = r.cstring();
    return new F.CommandCompleteMessage(Z, e);
  }, "parseCommandCompleteMessage"), Jc = a((r, e) => {
    let t = r.bytes(e - 4);
    return new F.CopyDataMessage(Z, t);
  }, "parseCopyData"), Xc = a((r) => Xs(r, "copyInResponse"), "parseCopyInMessage"), el = a((r) => Xs(r, "copyOutResponse"), "parseCopyOutMessage"), Xs = a((r, e) => {
    let t = r.byte() !== 0, n = r.int16(), i = new F.CopyResponse(Z, e, t, n);
    for (let s = 0;s < n; s++)
      i.columnTypes[s] = r.int16();
    return i;
  }, "parseCopyMessage"), tl = a((r) => {
    let e = r.int32(), t = r.cstring(), n = r.cstring();
    return new F.NotificationResponseMessage(Z, e, t, n);
  }, "parseNotificationMessage"), rl = a((r) => {
    let e = r.int16(), t = new F.RowDescriptionMessage(Z, e);
    for (let n = 0;n < e; n++)
      t.fields[n] = nl(r);
    return t;
  }, "parseRowDescriptionMessage"), nl = a((r) => {
    let e = r.cstring(), t = r.uint32(), n = r.int16(), i = r.uint32(), s = r.int16(), o = r.int32(), u = r.int16() === 0 ? "text" : "binary";
    return new F.Field(e, t, n, i, s, o, u);
  }, "parseField"), il = a((r) => {
    let e = r.int16(), t = new F.ParameterDescriptionMessage(Z, e);
    for (let n = 0;n < e; n++)
      t.dataTypeIDs[n] = r.uint32();
    return t;
  }, "parseParameterDescriptionMessage"), sl = a((r) => {
    let e = r.int16(), t = new Array(e);
    for (let n = 0;n < e; n++) {
      let i = r.int32();
      t[n] = i === -1 ? null : r.string(i);
    }
    return new F.DataRowMessage(Z, t);
  }, "parseDataRowMessage"), ol = a((r) => {
    let e = r.cstring(), t = r.cstring();
    return new F.ParameterStatusMessage(Z, e, t);
  }, "parseParameterStatusMessage"), al = a((r) => {
    let e = r.int32(), t = r.int32();
    return new F.BackendKeyDataMessage(Z, e, t);
  }, "parseBackendKeyData"), ul = a((r, e) => {
    let t = r.int32(), n = { name: "authenticationOk", length: e };
    switch (t) {
      case 0:
        break;
      case 3:
        n.length === 8 && (n.name = "authenticationCleartextPassword");
        break;
      case 5:
        if (n.length === 12) {
          n.name = "authenticationMD5Password";
          let i = r.bytes(4);
          return new F.AuthenticationMD5Password(Z, i);
        }
        break;
      case 10:
        {
          n.name = "authenticationSASL", n.mechanisms = [];
          let i;
          do
            i = r.cstring(), i && n.mechanisms.push(i);
          while (i);
        }
        break;
      case 11:
        n.name = "authenticationSASLContinue", n.data = r.string(e - 8);
        break;
      case 12:
        n.name = "authenticationSASLFinal", n.data = r.string(e - 8);
        break;
      default:
        throw new Error("Unknown authenticationOk message type " + t);
    }
    return n;
  }, "parseAuthenticationResponse"), Js = a((r, e) => {
    let t = {}, n = r.string(1);
    for (;n !== "\x00"; )
      t[n] = r.cstring(), n = r.string(1);
    let i = t.M, s = e === "notice" ? new F.NoticeMessage(Z, i) : new F.DatabaseError(i, Z, e);
    return s.severity = t.S, s.code = t.C, s.detail = t.D, s.hint = t.H, s.position = t.P, s.internalPosition = t.p, s.internalQuery = t.q, s.where = t.W, s.schema = t.s, s.table = t.t, s.column = t.c, s.dataType = t.d, s.constraint = t.n, s.file = t.F, s.line = t.L, s.routine = t.R, s;
  }, "parseErrorMessage");
});
var vn = T((_e) => {
  h();
  Object.defineProperty(_e, "__esModule", { value: true });
  _e.DatabaseError = _e.serialize = undefined;
  _e.parse = hl;
  var cl = ln();
  Object.defineProperty(_e, "DatabaseError", { enumerable: true, get: a(function() {
    return cl.DatabaseError;
  }, "get") });
  var ll = Ks();
  Object.defineProperty(_e, "serialize", {
    enumerable: true,
    get: a(function() {
      return ll.serialize;
    }, "get")
  });
  var fl = eo();
  function hl(r, e) {
    let t = new fl.Parser;
    return r.on("data", (n) => t.parse(n, e)), new Promise((n) => r.on("end", () => n()));
  }
  a(hl, "parse");
});
var to = {};
se(to, { connect: () => dl });
function dl({ socket: r, servername: e }) {
  return r.startTls(e), r;
}
var ro = V(() => {
  h();
  a(dl, "connect");
});
var An = T((Dd, so) => {
  h();
  var no = (Ge(), O(Ii)), pl = ve().EventEmitter, { parse: yl, serialize: Q } = vn(), io = Q.flush(), ml = Q.sync(), gl = Q.end(), En = class En2 extends pl {
    constructor(e) {
      super(), e = e || {}, this.stream = e.stream || new no.Socket, this._keepAlive = e.keepAlive, this._keepAliveInitialDelayMillis = e.keepAliveInitialDelayMillis, this.lastBuffer = false, this.parsedStatements = {}, this.ssl = e.ssl || false, this._ending = false, this._emitMessage = false;
      var t = this;
      this.on("newListener", function(n) {
        n === "message" && (t._emitMessage = true);
      });
    }
    connect(e, t) {
      var n = this;
      this._connecting = true, this.stream.setNoDelay(true), this.stream.connect(e, t), this.stream.once("connect", function() {
        n._keepAlive && n.stream.setKeepAlive(true, n._keepAliveInitialDelayMillis), n.emit("connect");
      });
      let i = a(function(s) {
        n._ending && (s.code === "ECONNRESET" || s.code === "EPIPE") || n.emit("error", s);
      }, "reportStreamError");
      if (this.stream.on("error", i), this.stream.on("close", function() {
        n.emit("end");
      }), !this.ssl)
        return this.attachListeners(this.stream);
      this.stream.once("data", function(s) {
        var o = s.toString("utf8");
        switch (o) {
          case "S":
            break;
          case "N":
            return n.stream.end(), n.emit("error", new Error("The server does not support SSL connections"));
          default:
            return n.stream.end(), n.emit("error", new Error("There was an error establishing an SSL connection"));
        }
        var u = (ro(), O(to));
        let c = { socket: n.stream };
        n.ssl !== true && (Object.assign(c, n.ssl), ("key" in n.ssl) && (c.key = n.ssl.key)), no.isIP(t) === 0 && (c.servername = t);
        try {
          n.stream = u.connect(c);
        } catch (l) {
          return n.emit("error", l);
        }
        n.attachListeners(n.stream), n.stream.on("error", i), n.emit("sslconnect");
      });
    }
    attachListeners(e) {
      e.on("end", () => {
        this.emit("end");
      }), yl(e, (t) => {
        var n = t.name === "error" ? "errorMessage" : t.name;
        this._emitMessage && this.emit("message", t), this.emit(n, t);
      });
    }
    requestSsl() {
      this.stream.write(Q.requestSsl());
    }
    startup(e) {
      this.stream.write(Q.startup(e));
    }
    cancel(e, t) {
      this._send(Q.cancel(e, t));
    }
    password(e) {
      this._send(Q.password(e));
    }
    sendSASLInitialResponseMessage(e, t) {
      this._send(Q.sendSASLInitialResponseMessage(e, t));
    }
    sendSCRAMClientFinalMessage(e) {
      this._send(Q.sendSCRAMClientFinalMessage(e));
    }
    _send(e) {
      return this.stream.writable ? this.stream.write(e) : false;
    }
    query(e) {
      this._send(Q.query(e));
    }
    parse(e) {
      this._send(Q.parse(e));
    }
    bind(e) {
      this._send(Q.bind(e));
    }
    execute(e) {
      this._send(Q.execute(e));
    }
    flush() {
      this.stream.writable && this.stream.write(io);
    }
    sync() {
      this._ending = true, this._send(io), this._send(ml);
    }
    ref() {
      this.stream.ref();
    }
    unref() {
      this.stream.unref();
    }
    end() {
      if (this._ending = true, !this._connecting || !this.stream.writable) {
        this.stream.end();
        return;
      }
      return this.stream.write(gl, () => {
        this.stream.end();
      });
    }
    close(e) {
      this._send(Q.close(e));
    }
    describe(e) {
      this._send(Q.describe(e));
    }
    sendCopyFromChunk(e) {
      this._send(Q.copyData(e));
    }
    endCopyFrom() {
      this._send(Q.copyDone());
    }
    sendCopyFail(e) {
      this._send(Q.copyFail(e));
    }
  };
  a(En, "Connection");
  var Sn = En;
  so.exports = Sn;
});
var uo = T((jd, ao) => {
  h();
  var wl = ve().EventEmitter, Wd = (it(), O(nt)), bl = rt(), Cn = xs(), xl = Ls(), vl = _t(), Sl = Lt(), oo = Gs(), El = tt(), Al = An(), _n = class _n2 extends wl {
    constructor(e) {
      super(), this.connectionParameters = new Sl(e), this.user = this.connectionParameters.user, this.database = this.connectionParameters.database, this.port = this.connectionParameters.port, this.host = this.connectionParameters.host, Object.defineProperty(this, "password", { configurable: true, enumerable: false, writable: true, value: this.connectionParameters.password }), this.replication = this.connectionParameters.replication;
      var t = e || {};
      this._Promise = t.Promise || b.Promise, this._types = new vl(t.types), this._ending = false, this._connecting = false, this._connected = false, this._connectionError = false, this._queryable = true, this.connection = t.connection || new Al({ stream: t.stream, ssl: this.connectionParameters.ssl, keepAlive: t.keepAlive || false, keepAliveInitialDelayMillis: t.keepAliveInitialDelayMillis || 0, encoding: this.connectionParameters.client_encoding || "utf8" }), this.queryQueue = [], this.binary = t.binary || El.binary, this.processID = null, this.secretKey = null, this.ssl = this.connectionParameters.ssl || false, this.ssl && this.ssl.key && Object.defineProperty(this.ssl, "key", { enumerable: false }), this._connectionTimeoutMillis = t.connectionTimeoutMillis || 0;
    }
    _errorAllQueries(e) {
      let t = a((n) => {
        y.nextTick(() => {
          n.handleError(e, this.connection);
        });
      }, "enqueueError");
      this.activeQuery && (t(this.activeQuery), this.activeQuery = null), this.queryQueue.forEach(t), this.queryQueue.length = 0;
    }
    _connect(e) {
      var t = this, n = this.connection;
      if (this._connectionCallback = e, this._connecting || this._connected) {
        let i = new Error("Client has already been connected. You cannot reuse a client.");
        y.nextTick(() => {
          e(i);
        });
        return;
      }
      this._connecting = true, this.connectionTimeoutHandle, this._connectionTimeoutMillis > 0 && (this.connectionTimeoutHandle = setTimeout(() => {
        n._ending = true, n.stream.destroy(new Error("timeout expired"));
      }, this._connectionTimeoutMillis)), this.host && this.host.indexOf("/") === 0 ? n.connect(this.host + "/.s.PGSQL." + this.port) : n.connect(this.port, this.host), n.on("connect", function() {
        t.ssl ? n.requestSsl() : n.startup(t.getStartupConf());
      }), n.on("sslconnect", function() {
        n.startup(t.getStartupConf());
      }), this._attachListeners(n), n.once("end", () => {
        let i = this._ending ? new Error("Connection terminated") : new Error("Connection terminated unexpectedly");
        clearTimeout(this.connectionTimeoutHandle), this._errorAllQueries(i), this._ending || (this._connecting && !this._connectionError ? this._connectionCallback ? this._connectionCallback(i) : this._handleErrorEvent(i) : this._connectionError || this._handleErrorEvent(i)), y.nextTick(() => {
          this.emit("end");
        });
      });
    }
    connect(e) {
      if (e) {
        this._connect(e);
        return;
      }
      return new this._Promise((t, n) => {
        this._connect((i) => {
          i ? n(i) : t();
        });
      });
    }
    _attachListeners(e) {
      e.on("authenticationCleartextPassword", this._handleAuthCleartextPassword.bind(this)), e.on("authenticationMD5Password", this._handleAuthMD5Password.bind(this)), e.on("authenticationSASL", this._handleAuthSASL.bind(this)), e.on("authenticationSASLContinue", this._handleAuthSASLContinue.bind(this)), e.on("authenticationSASLFinal", this._handleAuthSASLFinal.bind(this)), e.on("backendKeyData", this._handleBackendKeyData.bind(this)), e.on("error", this._handleErrorEvent.bind(this)), e.on("errorMessage", this._handleErrorMessage.bind(this)), e.on("readyForQuery", this._handleReadyForQuery.bind(this)), e.on("notice", this._handleNotice.bind(this)), e.on("rowDescription", this._handleRowDescription.bind(this)), e.on("dataRow", this._handleDataRow.bind(this)), e.on("portalSuspended", this._handlePortalSuspended.bind(this)), e.on("emptyQuery", this._handleEmptyQuery.bind(this)), e.on("commandComplete", this._handleCommandComplete.bind(this)), e.on("parseComplete", this._handleParseComplete.bind(this)), e.on("copyInResponse", this._handleCopyInResponse.bind(this)), e.on("copyData", this._handleCopyData.bind(this)), e.on("notification", this._handleNotification.bind(this));
    }
    _checkPgPass(e) {
      let t = this.connection;
      typeof this.password == "function" ? this._Promise.resolve().then(() => this.password()).then((n) => {
        if (n !== undefined) {
          if (typeof n != "string") {
            t.emit("error", new TypeError("Password must be a string"));
            return;
          }
          this.connectionParameters.password = this.password = n;
        } else
          this.connectionParameters.password = this.password = null;
        e();
      }).catch((n) => {
        t.emit("error", n);
      }) : this.password !== null ? e() : xl(this.connectionParameters, (n) => {
        n !== undefined && (this.connectionParameters.password = this.password = n), e();
      });
    }
    _handleAuthCleartextPassword(e) {
      this._checkPgPass(() => {
        this.connection.password(this.password);
      });
    }
    _handleAuthMD5Password(e) {
      this._checkPgPass(() => {
        let t = bl.postgresMd5PasswordHash(this.user, this.password, e.salt);
        this.connection.password(t);
      });
    }
    _handleAuthSASL(e) {
      this._checkPgPass(() => {
        this.saslSession = Cn.startSession(e.mechanisms), this.connection.sendSASLInitialResponseMessage(this.saslSession.mechanism, this.saslSession.response);
      });
    }
    _handleAuthSASLContinue(e) {
      Cn.continueSession(this.saslSession, this.password, e.data), this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
    }
    _handleAuthSASLFinal(e) {
      Cn.finalizeSession(this.saslSession, e.data), this.saslSession = null;
    }
    _handleBackendKeyData(e) {
      this.processID = e.processID, this.secretKey = e.secretKey;
    }
    _handleReadyForQuery(e) {
      this._connecting && (this._connecting = false, this._connected = true, clearTimeout(this.connectionTimeoutHandle), this._connectionCallback && (this._connectionCallback(null, this), this._connectionCallback = null), this.emit("connect"));
      let { activeQuery: t } = this;
      this.activeQuery = null, this.readyForQuery = true, t && t.handleReadyForQuery(this.connection), this._pulseQueryQueue();
    }
    _handleErrorWhileConnecting(e) {
      if (!this._connectionError) {
        if (this._connectionError = true, clearTimeout(this.connectionTimeoutHandle), this._connectionCallback)
          return this._connectionCallback(e);
        this.emit("error", e);
      }
    }
    _handleErrorEvent(e) {
      if (this._connecting)
        return this._handleErrorWhileConnecting(e);
      this._queryable = false, this._errorAllQueries(e), this.emit("error", e);
    }
    _handleErrorMessage(e) {
      if (this._connecting)
        return this._handleErrorWhileConnecting(e);
      let t = this.activeQuery;
      if (!t) {
        this._handleErrorEvent(e);
        return;
      }
      this.activeQuery = null, t.handleError(e, this.connection);
    }
    _handleRowDescription(e) {
      this.activeQuery.handleRowDescription(e);
    }
    _handleDataRow(e) {
      this.activeQuery.handleDataRow(e);
    }
    _handlePortalSuspended(e) {
      this.activeQuery.handlePortalSuspended(this.connection);
    }
    _handleEmptyQuery(e) {
      this.activeQuery.handleEmptyQuery(this.connection);
    }
    _handleCommandComplete(e) {
      this.activeQuery.handleCommandComplete(e, this.connection);
    }
    _handleParseComplete(e) {
      this.activeQuery.name && (this.connection.parsedStatements[this.activeQuery.name] = this.activeQuery.text);
    }
    _handleCopyInResponse(e) {
      this.activeQuery.handleCopyInResponse(this.connection);
    }
    _handleCopyData(e) {
      this.activeQuery.handleCopyData(e, this.connection);
    }
    _handleNotification(e) {
      this.emit("notification", e);
    }
    _handleNotice(e) {
      this.emit("notice", e);
    }
    getStartupConf() {
      var e = this.connectionParameters, t = { user: e.user, database: e.database }, n = e.application_name || e.fallback_application_name;
      return n && (t.application_name = n), e.replication && (t.replication = "" + e.replication), e.statement_timeout && (t.statement_timeout = String(parseInt(e.statement_timeout, 10))), e.lock_timeout && (t.lock_timeout = String(parseInt(e.lock_timeout, 10))), e.idle_in_transaction_session_timeout && (t.idle_in_transaction_session_timeout = String(parseInt(e.idle_in_transaction_session_timeout, 10))), e.options && (t.options = e.options), t;
    }
    cancel(e, t) {
      if (e.activeQuery === t) {
        var n = this.connection;
        this.host && this.host.indexOf("/") === 0 ? n.connect(this.host + "/.s.PGSQL." + this.port) : n.connect(this.port, this.host), n.on("connect", function() {
          n.cancel(e.processID, e.secretKey);
        });
      } else
        e.queryQueue.indexOf(t) !== -1 && e.queryQueue.splice(e.queryQueue.indexOf(t), 1);
    }
    setTypeParser(e, t, n) {
      return this._types.setTypeParser(e, t, n);
    }
    getTypeParser(e, t) {
      return this._types.getTypeParser(e, t);
    }
    escapeIdentifier(e) {
      return '"' + e.replace(/"/g, '""') + '"';
    }
    escapeLiteral(e) {
      for (var t = false, n = "'", i = 0;i < e.length; i++) {
        var s = e[i];
        s === "'" ? n += s + s : s === "\\" ? (n += s + s, t = true) : n += s;
      }
      return n += "'", t === true && (n = " E" + n), n;
    }
    _pulseQueryQueue() {
      if (this.readyForQuery === true)
        if (this.activeQuery = this.queryQueue.shift(), this.activeQuery) {
          this.readyForQuery = false, this.hasExecuted = true;
          let e = this.activeQuery.submit(this.connection);
          e && y.nextTick(() => {
            this.activeQuery.handleError(e, this.connection), this.readyForQuery = true, this._pulseQueryQueue();
          });
        } else
          this.hasExecuted && (this.activeQuery = null, this.emit("drain"));
    }
    query(e, t, n) {
      var i, s, o, u, c;
      if (e == null)
        throw new TypeError("Client was passed a null or undefined query");
      return typeof e.submit == "function" ? (o = e.query_timeout || this.connectionParameters.query_timeout, s = i = e, typeof t == "function" && (i.callback = i.callback || t)) : (o = this.connectionParameters.query_timeout, i = new oo(e, t, n), i.callback || (s = new this._Promise((l, f) => {
        i.callback = (m, g) => m ? f(m) : l(g);
      }))), o && (c = i.callback, u = setTimeout(() => {
        var l = new Error("Query read timeout");
        y.nextTick(() => {
          i.handleError(l, this.connection);
        }), c(l), i.callback = () => {};
        var f = this.queryQueue.indexOf(i);
        f > -1 && this.queryQueue.splice(f, 1), this._pulseQueryQueue();
      }, o), i.callback = (l, f) => {
        clearTimeout(u), c(l, f);
      }), this.binary && !i.binary && (i.binary = true), i._result && !i._result._types && (i._result._types = this._types), this._queryable ? this._ending ? (y.nextTick(() => {
        i.handleError(new Error("Client was closed and is not queryable"), this.connection);
      }), s) : (this.queryQueue.push(i), this._pulseQueryQueue(), s) : (y.nextTick(() => {
        i.handleError(new Error("Client has encountered a connection error and is not queryable"), this.connection);
      }), s);
    }
    ref() {
      this.connection.ref();
    }
    unref() {
      this.connection.unref();
    }
    end(e) {
      if (this._ending = true, !this.connection._connecting)
        if (e)
          e();
        else
          return this._Promise.resolve();
      if (this.activeQuery || !this._queryable ? this.connection.stream.destroy() : this.connection.end(), e)
        this.connection.once("end", e);
      else
        return new this._Promise((t) => {
          this.connection.once("end", t);
        });
    }
  };
  a(_n, "Client");
  var Ut = _n;
  Ut.Query = oo;
  ao.exports = Ut;
});
var fo = T((Gd, lo) => {
  h();
  var Cl = ve().EventEmitter, Tn = a(function() {}, "NOOP"), co = a((r, e) => {
    let t = r.findIndex(e);
    return t === -1 ? undefined : r.splice(t, 1)[0];
  }, "removeWhere"), Rn = class Rn2 {
    constructor(e, t, n) {
      this.client = e, this.idleListener = t, this.timeoutId = n;
    }
  };
  a(Rn, "IdleItem");
  var In = Rn, Ln = class Ln2 {
    constructor(e) {
      this.callback = e;
    }
  };
  a(Ln, "PendingItem");
  var qe = Ln;
  function _l() {
    throw new Error("Release called on client which has already been released to the pool.");
  }
  a(_l, "throwOnDoubleRelease");
  function Qt(r, e) {
    if (e)
      return { callback: e, result: undefined };
    let t, n, i = a(function(o, u) {
      o ? t(o) : n(u);
    }, "cb"), s = new r(function(o, u) {
      n = o, t = u;
    }).catch((o) => {
      throw Error.captureStackTrace(o), o;
    });
    return { callback: i, result: s };
  }
  a(Qt, "promisify");
  function Tl(r, e) {
    return a(function t(n) {
      n.client = e, e.removeListener("error", t), e.on("error", () => {
        r.log("additional client error after disconnection due to error", n);
      }), r._remove(e), r.emit("error", n, e);
    }, "idleListener");
  }
  a(Tl, "makeIdleListener");
  var Bn = class Bn2 extends Cl {
    constructor(e, t) {
      super(), this.options = Object.assign({}, e), e != null && "password" in e && Object.defineProperty(this.options, "password", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: e.password
      }), e != null && e.ssl && e.ssl.key && Object.defineProperty(this.options.ssl, "key", { enumerable: false }), this.options.max = this.options.max || this.options.poolSize || 10, this.options.min = this.options.min || 0, this.options.maxUses = this.options.maxUses || 1 / 0, this.options.allowExitOnIdle = this.options.allowExitOnIdle || false, this.options.maxLifetimeSeconds = this.options.maxLifetimeSeconds || 0, this.log = this.options.log || function() {}, this.Client = this.options.Client || t || ot().Client, this.Promise = this.options.Promise || b.Promise, typeof this.options.idleTimeoutMillis > "u" && (this.options.idleTimeoutMillis = 1e4), this._clients = [], this._idle = [], this._expired = new WeakSet, this._pendingQueue = [], this._endCallback = undefined, this.ending = false, this.ended = false;
    }
    _promiseTry(e) {
      let t = this.Promise;
      return typeof t.try == "function" ? t.try(e) : new t((n) => n(e()));
    }
    _isFull() {
      return this._clients.length >= this.options.max;
    }
    _isAboveMin() {
      return this._clients.length > this.options.min;
    }
    _pulseQueue() {
      if (this.log("pulse queue"), this.ended) {
        this.log("pulse queue ended");
        return;
      }
      if (this.ending) {
        this.log("pulse queue on ending"), this._idle.length && this._idle.slice().map((t) => {
          this._remove(t.client);
        }), this._clients.length || (this.ended = true, this._endCallback());
        return;
      }
      if (!this._pendingQueue.length) {
        this.log("no queued requests");
        return;
      }
      if (!this._idle.length && this._isFull())
        return;
      let e = this._pendingQueue.shift();
      if (this._idle.length) {
        let t = this._idle.pop();
        clearTimeout(t.timeoutId);
        let n = t.client;
        n.ref && n.ref();
        let i = t.idleListener;
        return this._acquireClient(n, e, i, false);
      }
      if (!this._isFull())
        return this.newClient(e);
      throw new Error("unexpected condition");
    }
    _remove(e, t) {
      let n = co(this._idle, (s) => s.client === e);
      n !== undefined && clearTimeout(n.timeoutId), this._clients = this._clients.filter((s) => s !== e);
      let i = this;
      e.end(() => {
        i.emit("remove", e), typeof t == "function" && t();
      });
    }
    connect(e) {
      if (this.ending) {
        let i = new Error("Cannot use a pool after calling end on the pool");
        return e ? e(i) : this.Promise.reject(i);
      }
      let t = Qt(this.Promise, e), n = t.result;
      if (this._isFull() || this._idle.length) {
        if (this._idle.length && y.nextTick(() => this._pulseQueue()), !this.options.connectionTimeoutMillis)
          return this._pendingQueue.push(new qe(t.callback)), n;
        let i = a((u, c, l) => {
          clearTimeout(o), t.callback(u, c, l);
        }, "queueCallback"), s = new qe(i), o = setTimeout(() => {
          co(this._pendingQueue, (u) => u.callback === i), s.timedOut = true, t.callback(new Error("timeout exceeded when trying to connect"));
        }, this.options.connectionTimeoutMillis);
        return o.unref && o.unref(), this._pendingQueue.push(s), n;
      }
      return this.newClient(new qe(t.callback)), n;
    }
    newClient(e) {
      let t = new this.Client(this.options);
      this._clients.push(t);
      let n = Tl(this, t);
      this.log("checking client timeout");
      let i, s = false;
      this.options.connectionTimeoutMillis && (i = setTimeout(() => {
        t.connection ? (this.log("ending client due to timeout"), s = true, t.connection.stream.destroy()) : t.isConnected() || (this.log("ending client due to timeout"), s = true, t.end());
      }, this.options.connectionTimeoutMillis)), this.log("connecting new client"), t.connect((o) => {
        if (i && clearTimeout(i), t.on("error", n), o)
          this.log("client failed to connect", o), this._clients = this._clients.filter((u) => u !== t), s && (o = new Error("Connection terminated due to connection timeout", { cause: o })), this._pulseQueue(), e.timedOut || e.callback(o, undefined, Tn);
        else {
          if (this.log("new client connected"), this.options.onConnect) {
            this._promiseTry(() => this.options.onConnect(t)).then(() => {
              this._afterConnect(t, e, n);
            }, (u) => {
              this._clients = this._clients.filter((c) => c !== t), t.end(() => {
                this._pulseQueue(), e.timedOut || e.callback(u, undefined, Tn);
              });
            });
            return;
          }
          return this._afterConnect(t, e, n);
        }
      });
    }
    _afterConnect(e, t, n) {
      if (this.options.maxLifetimeSeconds !== 0) {
        let i = setTimeout(() => {
          this.log("ending client due to expired lifetime"), this._expired.add(e), this._idle.findIndex((o) => o.client === e) !== -1 && this._acquireClient(e, new qe((o, u, c) => c()), n, false);
        }, this.options.maxLifetimeSeconds * 1000);
        i.unref(), e.once("end", () => clearTimeout(i));
      }
      return this._acquireClient(e, t, n, true);
    }
    _acquireClient(e, t, n, i) {
      i && this.emit("connect", e), this.emit("acquire", e), e.release = this._releaseOnce(e, n), e.removeListener("error", n), t.timedOut ? i && this.options.verify ? this.options.verify(e, e.release) : e.release() : i && this.options.verify ? this.options.verify(e, (s) => {
        if (s)
          return e.release(s), t.callback(s, undefined, Tn);
        t.callback(undefined, e, e.release);
      }) : t.callback(undefined, e, e.release);
    }
    _releaseOnce(e, t) {
      let n = false;
      return (i) => {
        n && _l(), n = true, this._release(e, t, i);
      };
    }
    _release(e, t, n) {
      if (e.on("error", t), e._poolUseCount = (e._poolUseCount || 0) + 1, this.emit("release", n, e), n || this.ending || !e._queryable || e._ending || e._poolUseCount >= this.options.maxUses)
        return e._poolUseCount >= this.options.maxUses && this.log("remove expended client"), this._remove(e, this._pulseQueue.bind(this));
      if (this._expired.has(e))
        return this.log("remove expired client"), this._expired.delete(e), this._remove(e, this._pulseQueue.bind(this));
      let s;
      this.options.idleTimeoutMillis && this._isAboveMin() && (s = setTimeout(() => {
        this._isAboveMin() && (this.log("remove idle client"), this._remove(e, this._pulseQueue.bind(this)));
      }, this.options.idleTimeoutMillis), this.options.allowExitOnIdle && s.unref()), this.options.allowExitOnIdle && e.unref(), this._idle.push(new In(e, t, s)), this._pulseQueue();
    }
    query(e, t, n) {
      if (typeof e == "function") {
        let s = Qt(this.Promise, e);
        return x(function() {
          return s.callback(new Error("Passing a function as the first parameter to pool.query is not supported"));
        }), s.result;
      }
      typeof t == "function" && (n = t, t = undefined);
      let i = Qt(this.Promise, n);
      return n = i.callback, this.connect((s, o) => {
        if (s)
          return n(s);
        let u = false, c = a((l) => {
          u || (u = true, o.release(l), n(l));
        }, "onError");
        o.once("error", c), this.log("dispatching query");
        try {
          o.query(e, t, (l, f) => {
            if (this.log("query dispatched"), o.removeListener("error", c), !u)
              return u = true, o.release(l), l ? n(l) : n(undefined, f);
          });
        } catch (l) {
          return o.release(l), n(l);
        }
      }), i.result;
    }
    end(e) {
      if (this.log("ending"), this.ending) {
        let n = new Error("Called end on pool more than once");
        return e ? e(n) : this.Promise.reject(n);
      }
      this.ending = true;
      let t = Qt(this.Promise, e);
      return this._endCallback = t.callback, this._pulseQueue(), t.result;
    }
    get waitingCount() {
      return this._pendingQueue.length;
    }
    get idleCount() {
      return this._idle.length;
    }
    get expiredCount() {
      return this._clients.reduce((e, t) => e + (this._expired.has(t) ? 1 : 0), 0);
    }
    get totalCount() {
      return this._clients.length;
    }
  };
  a(Bn, "Pool");
  var Pn = Bn;
  lo.exports = Pn;
});
var ho = {};
se(ho, { default: () => Il });
var Il;
var po = V(() => {
  h();
  Il = {};
});
var yo = T((Yd, Pl) => {
  Pl.exports = { name: "pg", version: "8.8.0", description: "PostgreSQL client - pure javascript & libpq with the same API", keywords: [
    "database",
    "libpq",
    "pg",
    "postgre",
    "postgres",
    "postgresql",
    "rdbms"
  ], homepage: "https://github.com/brianc/node-postgres", repository: { type: "git", url: "git://github.com/brianc/node-postgres.git", directory: "packages/pg" }, author: "Brian Carlson <brian.m.carlson@gmail.com>", main: "./lib", dependencies: { "buffer-writer": "2.0.0", "packet-reader": "1.0.0", "pg-connection-string": "^2.5.0", "pg-pool": "^3.5.2", "pg-protocol": "^1.5.0", "pg-types": "^2.1.0", pgpass: "1.x" }, devDependencies: {
    async: "2.6.4",
    bluebird: "3.5.2",
    co: "4.6.0",
    "pg-copy-streams": "0.3.0"
  }, peerDependencies: { "pg-native": ">=3.0.1" }, peerDependenciesMeta: { "pg-native": { optional: true } }, scripts: { test: "make test-all" }, files: ["lib", "SPONSORS.md"], license: "MIT", engines: { node: ">= 8.0.0" }, gitHead: "c99fb2c127ddf8d712500db2c7b9a5491a178655" };
});
var wo = T((Zd, go) => {
  h();
  var mo = ve().EventEmitter, Rl = (it(), O(nt)), Fn = rt(), Ne = go.exports = function(r, e, t) {
    mo.call(this), r = Fn.normalizeQueryConfig(r, e, t), this.text = r.text, this.values = r.values, this.name = r.name, this.callback = r.callback, this.state = "new", this._arrayMode = r.rowMode === "array", this._emitRowEvents = false, this.on("newListener", function(n) {
      n === "row" && (this._emitRowEvents = true);
    }.bind(this));
  };
  Rl.inherits(Ne, mo);
  var Ll = { sqlState: "code", statementPosition: "position", messagePrimary: "message", context: "where", schemaName: "schema", tableName: "table", columnName: "column", dataTypeName: "dataType", constraintName: "constraint", sourceFile: "file", sourceLine: "line", sourceFunction: "routine" };
  Ne.prototype.handleError = function(r) {
    var e = this.native.pq.resultErrorFields();
    if (e)
      for (var t in e) {
        var n = Ll[t] || t;
        r[n] = e[t];
      }
    this.callback ? this.callback(r) : this.emit("error", r), this.state = "error";
  };
  Ne.prototype.then = function(r, e) {
    return this._getPromise().then(r, e);
  };
  Ne.prototype.catch = function(r) {
    return this._getPromise().catch(r);
  };
  Ne.prototype._getPromise = function() {
    return this._promise ? this._promise : (this._promise = new Promise(function(r, e) {
      this._once("end", r), this._once("error", e);
    }.bind(this)), this._promise);
  };
  Ne.prototype.submit = function(r) {
    this.state = "running";
    var e = this;
    this.native = r.native, r.native.arrayMode = this._arrayMode;
    var t = a(function(s, o, u) {
      if (r.native.arrayMode = false, x(function() {
        e.emit("_done");
      }), s)
        return e.handleError(s);
      e._emitRowEvents && (u.length > 1 ? o.forEach((c, l) => {
        c.forEach((f) => {
          e.emit("row", f, u[l]);
        });
      }) : o.forEach(function(c) {
        e.emit("row", c, u);
      })), e.state = "end", e.emit("end", u), e.callback && e.callback(null, u);
    }, "after");
    if (y.domain && (t = y.domain.bind(t)), this.name) {
      this.name.length > 63 && (console.error("Warning! Postgres only supports 63 characters for query names."), console.error("You supplied %s (%s)", this.name, this.name.length), console.error("This can cause conflicts and silent errors executing queries"));
      var n = (this.values || []).map(Fn.prepareValue);
      if (r.namedQueries[this.name]) {
        if (this.text && r.namedQueries[this.name] !== this.text) {
          let s = new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
          return t(s);
        }
        return r.native.execute(this.name, n, t);
      }
      return r.native.prepare(this.name, this.text, n.length, function(s) {
        return s ? t(s) : (r.namedQueries[e.name] = e.text, e.native.execute(e.name, n, t));
      });
    } else if (this.values) {
      if (!Array.isArray(this.values)) {
        let s = new Error("Query values must be an array");
        return t(s);
      }
      var i = this.values.map(Fn.prepareValue);
      r.native.query(this.text, i, t);
    } else
      r.native.query(this.text, t);
  };
});
var So = T((tp, vo) => {
  h();
  var Bl = (po(), O(ho)), Fl = _t(), ep = yo(), bo = ve().EventEmitter, Ml = (it(), O(nt)), kl = Lt(), xo = wo(), Y = vo.exports = function(r) {
    bo.call(this), r = r || {}, this._Promise = r.Promise || b.Promise, this._types = new Fl(r.types), this.native = new Bl({ types: this._types }), this._queryQueue = [], this._ending = false, this._connecting = false, this._connected = false, this._queryable = true;
    var e = this.connectionParameters = new kl(r);
    this.user = e.user, Object.defineProperty(this, "password", { configurable: true, enumerable: false, writable: true, value: e.password }), this.database = e.database, this.host = e.host, this.port = e.port, this.namedQueries = {};
  };
  Y.Query = xo;
  Ml.inherits(Y, bo);
  Y.prototype._errorAllQueries = function(r) {
    let e = a((t) => {
      y.nextTick(() => {
        t.native = this.native, t.handleError(r);
      });
    }, "enqueueError");
    this._hasActiveQuery() && (e(this._activeQuery), this._activeQuery = null), this._queryQueue.forEach(e), this._queryQueue.length = 0;
  };
  Y.prototype._connect = function(r) {
    var e = this;
    if (this._connecting) {
      y.nextTick(() => r(new Error("Client has already been connected. You cannot reuse a client.")));
      return;
    }
    this._connecting = true, this.connectionParameters.getLibpqConnectionString(function(t, n) {
      if (t)
        return r(t);
      e.native.connect(n, function(i) {
        if (i)
          return e.native.end(), r(i);
        e._connected = true, e.native.on("error", function(s) {
          e._queryable = false, e._errorAllQueries(s), e.emit("error", s);
        }), e.native.on("notification", function(s) {
          e.emit("notification", { channel: s.relname, payload: s.extra });
        }), e.emit("connect"), e._pulseQueryQueue(true), r();
      });
    });
  };
  Y.prototype.connect = function(r) {
    if (r) {
      this._connect(r);
      return;
    }
    return new this._Promise((e, t) => {
      this._connect((n) => {
        n ? t(n) : e();
      });
    });
  };
  Y.prototype.query = function(r, e, t) {
    var n, i, s, o, u;
    if (r == null)
      throw new TypeError("Client was passed a null or undefined query");
    if (typeof r.submit == "function")
      s = r.query_timeout || this.connectionParameters.query_timeout, i = n = r, typeof e == "function" && (r.callback = e);
    else if (s = this.connectionParameters.query_timeout, n = new xo(r, e, t), !n.callback) {
      let c, l;
      i = new this._Promise((f, m) => {
        c = f, l = m;
      }), n.callback = (f, m) => f ? l(f) : c(m);
    }
    return s && (u = n.callback, o = setTimeout(() => {
      var c = new Error("Query read timeout");
      y.nextTick(() => {
        n.handleError(c, this.connection);
      }), u(c), n.callback = () => {};
      var l = this._queryQueue.indexOf(n);
      l > -1 && this._queryQueue.splice(l, 1), this._pulseQueryQueue();
    }, s), n.callback = (c, l) => {
      clearTimeout(o), u(c, l);
    }), this._queryable ? this._ending ? (n.native = this.native, y.nextTick(() => {
      n.handleError(new Error("Client was closed and is not queryable"));
    }), i) : (this._queryQueue.push(n), this._pulseQueryQueue(), i) : (n.native = this.native, y.nextTick(() => {
      n.handleError(new Error("Client has encountered a connection error and is not queryable"));
    }), i);
  };
  Y.prototype.end = function(r) {
    var e = this;
    this._ending = true, this._connected || this.once("connect", this.end.bind(this, r));
    var t;
    return r || (t = new this._Promise(function(n, i) {
      r = a((s) => s ? i(s) : n(), "cb");
    })), this.native.end(function() {
      e._errorAllQueries(new Error("Connection terminated")), y.nextTick(() => {
        e.emit("end"), r && r();
      });
    }), t;
  };
  Y.prototype._hasActiveQuery = function() {
    return this._activeQuery && this._activeQuery.state !== "error" && this._activeQuery.state !== "end";
  };
  Y.prototype._pulseQueryQueue = function(r) {
    if (this._connected && !this._hasActiveQuery()) {
      var e = this._queryQueue.shift();
      if (!e) {
        r || this.emit("drain");
        return;
      }
      this._activeQuery = e, e.submit(this);
      var t = this;
      e.once("_done", function() {
        t._pulseQueryQueue();
      });
    }
  };
  Y.prototype.cancel = function(r) {
    this._activeQuery === r ? this.native.cancel(function() {}) : this._queryQueue.indexOf(r) !== -1 && this._queryQueue.splice(this._queryQueue.indexOf(r), 1);
  };
  Y.prototype.ref = function() {};
  Y.prototype.unref = function() {};
  Y.prototype.setTypeParser = function(r, e, t) {
    return this._types.setTypeParser(r, e, t);
  };
  Y.prototype.getTypeParser = function(r, e) {
    return this._types.getTypeParser(r, e);
  };
});
var Mn = T((ip, Eo) => {
  h();
  Eo.exports = So();
});
var ot = T((op, at) => {
  h();
  var Ol = uo(), Ul = tt(), Ql = An(), Dl = fo(), { DatabaseError: ql } = vn(), Nl = a((r) => {
    var e;
    return e = class extends Dl {
      constructor(n) {
        super(n, r);
      }
    }, a(e, "BoundPool"), e;
  }, "poolFactory"), kn = a(function(r) {
    this.defaults = Ul, this.Client = r, this.Query = this.Client.Query, this.Pool = Nl(this.Client), this._pools = [], this.Connection = Ql, this.types = Je(), this.DatabaseError = ql;
  }, "PG");
  typeof y.env.NODE_PG_FORCE_NATIVE < "u" ? at.exports = new kn(Mn()) : (at.exports = new kn(Ol), Object.defineProperty(at.exports, "native", {
    configurable: true,
    enumerable: false,
    get() {
      var r = null;
      try {
        r = new kn(Mn());
      } catch (e) {
        if (e.code !== "MODULE_NOT_FOUND")
          throw e;
      }
      return Object.defineProperty(at.exports, "native", { value: r }), r;
    }
  }));
});
h();
h();
h();
var da = Object.defineProperty;
var pa = Object.defineProperties;
var ya = Object.getOwnPropertyDescriptors;
var ai = Object.getOwnPropertySymbols;
var ma = Object.prototype.hasOwnProperty;
var ga = Object.prototype.propertyIsEnumerable;
var ui = a((r, e, t) => (e in r) ? da(r, e, { enumerable: true, configurable: true, writable: true, value: t }) : r[e] = t, "__defNormalProp");
var wa = a((r, e) => {
  for (var t in e || (e = {}))
    ma.call(e, t) && ui(r, t, e[t]);
  if (ai)
    for (var t of ai(e))
      ga.call(e, t) && ui(r, t, e[t]);
  return r;
}, "__spreadValues");
var ba = a((r, e) => pa(r, ya(e)), "__spreadProps");
var xa = 1008000;
var ci = new Uint8Array(new Uint16Array([258]).buffer)[0] === 2;
var va = new TextDecoder;
var Yt = new TextEncoder;
var dt = Yt.encode("0123456789abcdef");
var pt = Yt.encode("0123456789ABCDEF");
var Sa = Yt.encode("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
var li = Sa.slice();
li[62] = 45;
li[63] = 95;
var je;
var yt;
function Ea(r, { alphabet: e, scratchArr: t } = {}) {
  if (!je)
    if (je = new Uint16Array(256), yt = new Uint16Array(256), ci)
      for (let S = 0;S < 256; S++)
        je[S] = dt[S & 15] << 8 | dt[S >>> 4], yt[S] = pt[S & 15] << 8 | pt[S >>> 4];
    else
      for (let S = 0;S < 256; S++)
        je[S] = dt[S & 15] | dt[S >>> 4] << 8, yt[S] = pt[S & 15] | pt[S >>> 4] << 8;
  r.byteOffset % 4 !== 0 && (r = new Uint8Array(r));
  let n = r.length, i = n >>> 1, s = n >>> 2, o = t || new Uint16Array(n), u = new Uint32Array(r.buffer, r.byteOffset, s), c = new Uint32Array(o.buffer, o.byteOffset, i), l = e === "upper" ? yt : je, f = 0, m = 0, g;
  if (ci)
    for (;f < s; )
      g = u[f++], c[m++] = l[g >>> 8 & 255] << 16 | l[g & 255], c[m++] = l[g >>> 24] << 16 | l[g >>> 16 & 255];
  else
    for (;f < s; )
      g = u[f++], c[m++] = l[g >>> 24] << 16 | l[g >>> 16 & 255], c[m++] = l[g >>> 8 & 255] << 16 | l[g & 255];
  for (f <<= 2;f < n; )
    o[f] = l[r[f++]];
  return va.decode(o.subarray(0, n));
}
a(Ea, "_toHex");
function Aa(r, e = {}) {
  let t = "", n = r.length, i = xa >>> 1, s = Math.ceil(n / i), o = new Uint16Array(s > 1 ? i : n), u = ba(wa({}, e), { scratchArr: o });
  for (let c = 0;c < s; c++) {
    let l = c * i, f = l + i;
    t += Ea(r.subarray(l, f), u);
  }
  return t;
}
a(Aa, "_toHexChunked");
function fi(r, e = {}) {
  return e.alphabet !== "upper" && typeof r.toHex == "function" ? r.toHex() : Aa(r, e);
}
a(fi, "toHex");
h();
h();
var Zt = class Zt2 {
  constructor(e, t, n) {
    E(this, "execute", e);
    E(this, "queryData", t);
    E(this, "opts", n);
  }
  then(e, t) {
    return this.execute(this.queryData, this.opts).then(e, t);
  }
  catch(e) {
    return this.execute(this.queryData, this.opts).catch(e);
  }
  finally(e) {
    return this.execute(this.queryData, this.opts).finally(e);
  }
};
a(Zt, "NeonQueryPromise");
var xe = Zt;
var mt = class mt2 {
  constructor(e, t) {
    E(this, "strings", e);
    E(this, "values", t);
  }
  toParameterizedQuery(e = {
    query: "",
    params: []
  }) {
    let { strings: t, values: n } = this;
    for (let i = 0, s = t.length;i < s; i++)
      if (e.query += t[i], i < n.length) {
        let o = n[i];
        if (o instanceof $e)
          e.query += o.sql;
        else if (o instanceof xe)
          if (o.queryData instanceof mt2)
            o.queryData.toParameterizedQuery(e);
          else {
            if (o.queryData.params?.length)
              throw new Error("This query is not composable");
            e.query += o.queryData.query;
          }
        else {
          let { params: u } = e;
          u.push(o), e.query += "$" + u.length, (o instanceof p || ArrayBuffer.isView(o)) && (e.query += "::bytea");
        }
      }
    return e;
  }
};
a(mt, "SqlTemplate");
var He = mt;
var Jt = class Jt2 {
  constructor(e) {
    E(this, "sql", e);
  }
};
a(Jt, "UnsafeRawSql");
var $e = Jt;
h();
function gt() {
  typeof window < "u" && typeof document < "u" && typeof console < "u" && typeof console.warn == "function" && console.warn(`          
        ************************************************************
        *                                                          *
        *  WARNING: Running SQL directly from the browser can have *
        *  security implications. Even if your database is         *
        *  protected by Row-Level Security (RLS), use it at your   *
        *  own risk. This approach is great for fast prototyping,  *
        *  but ensure proper safeguards are in place to prevent    *
        *  misuse or execution of expensive SQL queries by your    *
        *  end users.                                              *
        *                                                          *
        *  If you've assessed the risks, suppress this message     *
        *  using the disableWarningInBrowsers configuration        *
        *  parameter.                                              *
        *                                                          *
        ************************************************************`);
}
a(gt, "warnIfBrowser");
h();
h();
var wt = class wt2 extends Error {
  constructor(t) {
    super(t);
    E(this, "name", "NeonDbError");
    E(this, "severity");
    E(this, "code");
    E(this, "detail");
    E(this, "hint");
    E(this, "position");
    E(this, "internalPosition");
    E(this, "internalQuery");
    E(this, "where");
    E(this, "schema");
    E(this, "table");
    E(this, "column");
    E(this, "dataType");
    E(this, "constraint");
    E(this, "file");
    E(this, "line");
    E(this, "routine");
    E(this, "sourceError");
    "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(this, wt2);
  }
};
a(wt, "NeonDbError");
var N = wt;
var hi = ["severity", "code", "detail", "hint", "position", "internalPosition", "internalQuery", "where", "schema", "table", "column", "dataType", "constraint", "file", "line", "routine"];
function di(r, e) {
  let t, n;
  try {
    t = new URL(r).protocol, n = new URL("http:" + r.slice(t.length));
  } catch {
    throw new N(`Database connection string provided to neon() is not a valid URL (connection string: ${r})`);
  }
  let {
    username: i,
    hostname: s,
    pathname: o
  } = n;
  if (t !== "postgres:" && t !== "postgresql:" || e && (!i || !s || s === "-" || !o || o === "/"))
    throw new N("Wrong URL scheme or missing user, host or database in connection parameters");
  return n;
}
a(di, "URLFromPgConnectionString");
function Ca(r) {
  return "postgresql:" + r.href.slice(r.protocol.length);
}
a(Ca, "pgConnectionStringFromURL");
var _a = ["connectionString", "user", "username", "password", "host", "hostname", "port", "database"];
var Ta = { database: "pathname", user: "username", host: "hostname" };
function pi(...r) {
  let e = {};
  for (let t of r)
    e = t.connectionString !== undefined ? t : { ...e, ...t };
  return e;
}
a(pi, "mergeConnectionParams");
async function yi(r = "postgresql://-", e = {}, t = {}) {
  if (e.connectionString !== undefined && (r = e.connectionString), typeof r == "function" && (r = await r()), typeof r != "string")
    throw new N("Connection string must be a string or a function resolving to one");
  if (e.user !== undefined && e.username !== undefined)
    throw new N("Please specify one only of user and username");
  if (e.host !== undefined && e.hostname !== undefined)
    throw new N("Please specify one only of host and hostname");
  let n = di(r, false);
  await Promise.all(_a.map(async (u) => {
    if (u === "connectionString")
      return;
    let c = e[u];
    if (typeof c == "function" && (c = await c()), c === undefined)
      return;
    if (typeof c != "string" && !(u === "port" && typeof c == "number")) {
      let f = u === "port" ? " or a number" : "";
      throw new N(`Connection parameter "${u}" must be a string${f} or a function resolving to one`);
    }
    let l = Ta[u] ?? u;
    n[l] = c;
  }));
  let { searchParams: i } = n;
  for (let u in t)
    i.has(u) || i.append(u, t[u]);
  let s = Ca(n), o = di(s, true);
  return { resolvedConnectionString: s, resolvedURL: o };
}
a(yi, "resolveConnectionParams");
Ge();
h();
var vt = "pkg:npm/%40neondatabase/serverless@1.2.0";
var ds = we(_t());
var ps = we(rt());
var ls = "transaction() expects an array of queries, or a function returning an array of queries";
function Nu(r) {
  return r instanceof p ? "\\x" + fi(r) : r;
}
a(Nu, "encodeBuffersAsBytea");
function fs(r) {
  let { query: e, params: t } = r instanceof He ? r.toParameterizedQuery() : r;
  return { query: e, params: t.map((n) => Nu((0, ps.prepareValue)(n))) };
}
a(fs, "prepareQuery");
function ys(r, e = {}) {
  typeof r != "string" && (e = r ?? {}, r = undefined);
  let {
    arrayMode: t,
    fullResults: n,
    fetchOptions: i,
    isolationLevel: s,
    readOnly: o,
    deferrable: u,
    authToken: c,
    disableWarningInBrowsers: l
  } = e;
  function f(g, ...w) {
    if (!(Array.isArray(g) && Array.isArray(g.raw) && Array.isArray(w)))
      throw new Error('This function can now be called only as a tagged-template function: sql`SELECT ${value}`, not sql("SELECT $1", [value], options). For a conventional function call with value placeholders ($1, $2, etc.), use sql.query("SELECT $1", [value], options).');
    return new xe(m, new He(g, w));
  }
  a(f, "templateFn"), f.query = (g, w, S) => new xe(m, { query: g, params: w ?? [] }, S), f.unsafe = (g) => new $e(g), f.transaction = async (g, w) => {
    if (typeof g == "function" && (g = g(f)), !Array.isArray(g))
      throw new Error(ls);
    g.forEach((D) => {
      if (!(D instanceof xe))
        throw new Error(ls);
    });
    let S = g.map((D) => D.queryData), k = g.map((D) => D.opts ?? {});
    return m(S, k, w);
  };
  async function m(g, w, S) {
    let {
      fetchEndpoint: k,
      fetchFunction: D
    } = pe, he = Array.isArray(g) ? { queries: g.map((G) => fs(G)) } : fs(g), I = i ?? {}, C = t ?? false, re = n ?? false, ne = s, H = o, oe = u;
    S !== undefined && (S.fetchOptions !== undefined && (I = { ...I, ...S.fetchOptions }), S.arrayMode !== undefined && (C = S.arrayMode), S.fullResults !== undefined && (re = S.fullResults), S.isolationLevel !== undefined && (ne = S.isolationLevel), S.readOnly !== undefined && (H = S.readOnly), S.deferrable !== undefined && (oe = S.deferrable)), w !== undefined && !Array.isArray(w) && w.fetchOptions !== undefined && (I = { ...I, ...w.fetchOptions });
    let ae = c;
    !Array.isArray(w) && w?.authToken !== undefined && (ae = w.authToken);
    let me = pi(e, S ?? {}, Array.isArray(w) || !w ? {} : w), { resolvedConnectionString: R, resolvedURL: $ } = await yi(r, me, { application_name: vt }), Ee = typeof k == "function" ? k($.hostname, $.port, { jwtAuth: ae !== undefined }) : k, ue = {
      "Neon-Connection-String": R,
      "Neon-Raw-Text-Output": "true",
      "Neon-Array-Mode": "true"
    }, Te = await Wu(ae);
    Te && (ue.Authorization = `Bearer ${Te}`), Array.isArray(g) && (ne !== undefined && (ue["Neon-Batch-Isolation-Level"] = ne), H !== undefined && (ue["Neon-Batch-Read-Only"] = String(H)), oe !== undefined && (ue["Neon-Batch-Deferrable"] = String(oe))), l || pe.disableWarningInBrowsers || gt();
    let ce;
    try {
      ce = await (D ?? fetch)(Ee, { method: "POST", body: JSON.stringify(he), headers: ue, ...I });
    } catch (G) {
      let q = new N(`Error connecting to database: ${G}`);
      throw q.sourceError = G, q;
    }
    if (ce.ok) {
      let G = await ce.json();
      if (Array.isArray(g)) {
        let q = G.results;
        if (!Array.isArray(q))
          throw new N("Neon internal error: unexpected result format");
        return q.map((ge, J) => {
          let ie = w[J] ?? {}, Dt = ie.arrayMode ?? C, Io = ie.fullResults ?? re;
          return hs(ge, { arrayMode: Dt, fullResults: Io, types: ie.types });
        });
      } else {
        let q = w ?? {}, ge = q.arrayMode ?? C, J = q.fullResults ?? re;
        return hs(G, { arrayMode: ge, fullResults: J, types: q.types });
      }
    } else {
      let { status: G } = ce;
      if (G === 400) {
        let q = await ce.json(), ge = new N(q.message);
        for (let J of hi)
          ge[J] = q[J] ?? undefined;
        throw ge;
      } else {
        let q = await ce.text();
        throw new N(`Server error (HTTP status ${G}): ${q}`);
      }
    }
  }
  return a(m, "execute"), f;
}
a(ys, "neon");
function hs(r, { arrayMode: e, fullResults: t, types: n }) {
  let i = new ds.default(n), s = r.fields.map((c) => c.name), o = r.fields.map((c) => i.getTypeParser(c.dataTypeID)), u = e === true ? r.rows.map((c) => c.map((l, f) => l === null ? null : o[f](l))) : r.rows.map((c) => Object.fromEntries(c.map((l, f) => [s[f], l === null ? null : o[f](l)])));
  return t ? (r.viaNeonFetch = true, r.rowAsArray = e, r.rows = u, r._parsers = o, r._types = i, r) : u;
}
a(hs, "processQueryResult");
async function Wu(r) {
  if (typeof r == "string")
    return r;
  if (typeof r == "function")
    try {
      return await Promise.resolve(r());
    } catch (e) {
      let t = new N("Error getting auth token.");
      throw e instanceof Error && (t = new N(`Error getting auth token: ${e.message}`)), t;
    }
}
a(Wu, "getAuthToken");
h();
h();
var Co = we(ot());
h();
var Ao = we(ot());
var On = class On2 extends Ao.Client {
  constructor(t) {
    let n = typeof t == "string" ? { connectionString: t } : {
      ...t,
      ...t && "password" in t ? { password: t.password } : {}
    };
    super({ fallback_application_name: vt, ...n });
    E(this, "config", t);
  }
  get neonConfig() {
    return this.connection.stream;
  }
  connect(t) {
    let { neonConfig: n } = this;
    n.forceDisablePgSSL && (this.ssl = this.connection.ssl = false), this.ssl && n.useSecureWebSocket && console.warn("SSL is enabled for both Postgres (e.g. ?sslmode=require in the connection string + forceDisablePgSSL = false) and the WebSocket tunnel (useSecureWebSocket = true). Double encryption will increase latency and CPU usage. It may be appropriate to disable SSL in the Postgres connection parameters or set forceDisablePgSSL = true.");
    let i = typeof this.config != "string" && this.config?.host !== undefined || typeof this.config != "string" && this.config?.connectionString !== undefined || y.env.PGHOST !== undefined, s = y.env.USER ?? y.env.USERNAME;
    if (!i && this.host === "localhost" && this.user === s && this.database === s && this.password === null)
      throw new Error(`No database host or connection string was set, and key parameters have default values (host: localhost, user: ${s}, db: ${s}, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.`);
    let o = super.connect(t), u = n.pipelineTLS && this.ssl, c = n.pipelineConnect === "password";
    if (!u && !n.pipelineConnect)
      return o;
    let l = this.connection;
    if (u && l.on("connect", () => l.stream.emit("data", "S")), c) {
      l.removeAllListeners("authenticationCleartextPassword"), l.removeAllListeners("readyForQuery"), l.once("readyForQuery", () => l.on("readyForQuery", this._handleReadyForQuery.bind(this)));
      let f = this.password, m = Promise.resolve(typeof f == "function" ? f() : f), g = this.ssl ? "sslconnect" : "connect";
      l.on(g, () => {
        this.neonConfig.disableWarningInBrowsers || gt(), m.then((w) => {
          this.password = w, this._handleAuthCleartextPassword(), this._handleReadyForQuery();
        }).catch((w) => l.emit("error", w));
      });
    }
    return o;
  }
  async _handleAuthSASLContinue(t) {
    if (typeof crypto > "u" || crypto.subtle === undefined || crypto.subtle.importKey === undefined)
      throw new Error("Cannot use SASL auth when `crypto.subtle` is not defined");
    let n = crypto.subtle, i = this.saslSession, s = this.password, o = t.data;
    if (i.message !== "SASLInitialResponse" || typeof s != "string" || typeof o != "string")
      throw new Error("SASL: protocol error");
    let u = Object.fromEntries(o.split(",").map((J) => {
      if (!/^.=/.test(J))
        throw new Error("SASL: Invalid attribute pair entry");
      let ie = J[0], Dt = J.substring(2);
      return [ie, Dt];
    })), c = u.r, l = u.s, f = u.i;
    if (!c || !/^[!-+--~]+$/.test(c))
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing/unprintable");
    if (!l || !/^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(l))
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing/not base64");
    if (!f || !/^[1-9][0-9]*$/.test(f))
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: missing/invalid iteration count");
    if (!c.startsWith(i.clientNonce))
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
    if (c.length === i.clientNonce.length)
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
    let m = parseInt(f, 10), g = p.from(l, "base64"), w = new TextEncoder, S = w.encode(s), k = await n.importKey("raw", S, { name: "HMAC", hash: { name: "SHA-256" } }, false, ["sign"]), D = new Uint8Array(await n.sign("HMAC", k, p.concat([g, p.from([0, 0, 0, 1])]))), he = D;
    for (var I = 0;I < m - 1; I++)
      D = new Uint8Array(await n.sign("HMAC", k, D)), he = p.from(he.map((J, ie) => he[ie] ^ D[ie]));
    let C = he, re = await n.importKey("raw", C, { name: "HMAC", hash: { name: "SHA-256" } }, false, ["sign"]), ne = new Uint8Array(await n.sign("HMAC", re, w.encode("Client Key"))), H = await n.digest("SHA-256", ne), oe = "n=*,r=" + i.clientNonce, ae = "r=" + c + ",s=" + l + ",i=" + m, me = "c=biws,r=" + c, R = oe + "," + ae + "," + me, $ = await n.importKey("raw", H, { name: "HMAC", hash: { name: "SHA-256" } }, false, ["sign"]);
    var Ee = new Uint8Array(await n.sign("HMAC", $, w.encode(R))), ue = p.from(ne.map((J, ie) => ne[ie] ^ Ee[ie])), Te = ue.toString("base64");
    let ce = await n.importKey("raw", C, { name: "HMAC", hash: { name: "SHA-256" } }, false, ["sign"]), G = await n.sign("HMAC", ce, w.encode("Server Key")), q = await n.importKey("raw", G, { name: "HMAC", hash: { name: "SHA-256" } }, false, ["sign"]);
    var ge = p.from(await n.sign("HMAC", q, w.encode(R)));
    i.message = "SASLResponse", i.serverSignature = ge.toString("base64"), i.response = me + ",p=" + Te, this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
  }
};
a(On, "NeonClient");
var ut = On;
Ge();
var _o = we(Lt());
function Wl(r, e) {
  if (e)
    return { callback: e, result: undefined };
  let t, n, i = a(function(o, u) {
    o ? t(o) : n(u);
  }, "cb"), s = new r(function(o, u) {
    n = o, t = u;
  });
  return { callback: i, result: s };
}
a(Wl, "promisify");
var Qn = class Qn2 extends Co.Pool {
  constructor() {
    super(...arguments);
    E(this, "Client", ut);
    E(this, "hasFetchUnsupportedListeners", false);
    E(this, "addListener", this.on);
  }
  on(t, n) {
    return t !== "error" && (this.hasFetchUnsupportedListeners = true), super.on(t, n);
  }
  query(t, n, i) {
    if (!pe.poolQueryViaFetch || this.hasFetchUnsupportedListeners || typeof t == "function")
      return super.query(t, n, i);
    typeof n == "function" && (i = n, n = undefined);
    let s = Wl(this.Promise, i);
    i = s.callback;
    try {
      let o = new _o.default(this.options), u = encodeURIComponent, c = encodeURI, l = `postgresql://${u(o.user)}:${u(o.password)}@${u(o.host)}/${c(o.database)}`, f = typeof t == "string" ? t : t.text, m = n ?? t.values ?? [];
      ys(l, { fullResults: true, arrayMode: t.rowMode === "array" }).query(f, m, { types: t.types ?? this.options?.types }).then((w) => i(undefined, w)).catch((w) => i(w));
    } catch (o) {
      i(o);
    }
    return s.result;
  }
};
a(Qn, "NeonPool");
Ge();
var ct = we(ot());
h();
var To = we(Ir());
function jl(r) {
  return Object.entries(r).reduce((t, [n, i]) => (i != null && (t[n] = i), t), Object.create(null));
}
a(jl, "toConnectionOptions");
function Hl(r) {
  return Object.entries(r).reduce((t, [n, i]) => {
    if (n === "ssl") {
      let s = i;
      typeof s == "boolean" && (t[n] = s), typeof s == "object" && (t[n] = jl(s));
    } else if (i != null)
      if (n === "port") {
        if (i !== "") {
          let s = parseInt(i, 10);
          if (isNaN(s))
            throw new Error(`Invalid ${n}: ${i}`);
          t[n] = s;
        }
      } else
        t[n] = i;
    return t;
  }, Object.create(null));
}
a(Hl, "toClientConfig");
function $l(r) {
  return Hl((0, To.parse)(r));
}
a($l, "parseIntoClientConfig");
var export_DatabaseError = ct.DatabaseError;
var export_defaults = ct.defaults;
var export_escapeIdentifier = ct.escapeIdentifier;
var export_escapeLiteral = ct.escapeLiteral;
var export_types = ct.types;
/*! Bundled license information:

ieee754/index.js:
  (*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> *)

buffer/index.js:
  (*!
   * The buffer module from node.js, for the browser.
   *
   * @author   Feross Aboukhadijeh <https://feross.org>
   * @license  MIT
   *)
*/

// src/db.ts
var client;
var runner;
async function q(text, params = []) {
  if (runner)
    return await runner(text, params);
  client ??= ys(config().databaseUrl);
  return await client.query(text, params);
}
async function one(text, params = []) {
  return (await q(text, params))[0] ?? null;
}
var now = () => Math.floor(Date.now() / 1000);

// src/log.ts
function log(level, msg, extra = {}) {
  const line = JSON.stringify({ level, msg, t: new Date().toISOString(), ...extra });
  if (level === "error")
    console.error(line);
  else
    console.log(line);
}

// src/store.ts
var MAX_SCREENSHOTS = 8;
var plugin = (r) => ({
  rid: Number(r.rid),
  id: r.id,
  owner: Number(r.owner_user_id),
  name: r.name,
  author: r.author,
  description: r.description_json,
  icon: r.icon,
  repoUrl: r.repo_url ?? null,
  repoWarning: r.repo_warning ?? null,
  hidden: r.hidden,
  createdAt: Number(r.created_at)
});
var screenshot = (r) => ({
  id: Number(r.id),
  pluginId: r.plugin_id,
  position: Number(r.position),
  msgId: r.msg_id === null ? null : Number(r.msg_id),
  fileId: r.file_id,
  uniqueId: r.file_unique_id
});
var repoChange = (r) => ({
  id: Number(r.id),
  pluginId: r.plugin_id,
  repoUrl: r.repo_url,
  warning: r.warning,
  status: r.status,
  submitter: Number(r.submitter_id),
  rejectReason: r.reject_reason,
  modMsgs: r.mod_msgs ?? [],
  createdAt: Number(r.created_at)
});
var version = (r) => ({
  rid: Number(r.rid),
  pluginId: r.plugin_id,
  version: r.version,
  msgId: r.msg_id === null ? null : Number(r.msg_id),
  date: Number(r.date),
  changelog: r.changelog,
  grants: r.grants_json,
  status: r.status,
  sha256: r.file_sha256,
  fileId: r.file_id,
  submitter: Number(r.submitter_id),
  rejectReason: r.reject_reason,
  modMsgs: r.mod_msgs ?? [],
  createdAt: Number(r.created_at)
});
async function touchUser(id, name) {
  await q(`INSERT INTO users (id, name, created_at) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET name = COALESCE(EXCLUDED.name, users.name)`, [id, name, now()]);
}
async function isBanned(id) {
  return !!await one("SELECT 1 FROM users WHERE id = $1 AND banned", [id]);
}
async function setBanned(id, banned) {
  await q(`INSERT INTO users (id, banned, created_at) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET banned = EXCLUDED.banned`, [id, banned, now()]);
}
async function listBanned(offset, limit) {
  const total = Number((await one("SELECT count(*) AS n FROM users WHERE banned")).n);
  const rows = await q("SELECT id, name FROM users WHERE banned ORDER BY id LIMIT $1 OFFSET $2", [limit, offset]);
  return { rows: rows.map((r) => ({ id: Number(r.id), name: r.name })), total };
}
async function getPlugin(id) {
  const r = await one("SELECT * FROM plugins WHERE id = $1", [id]);
  return r && plugin(r);
}
async function getPluginByRid(rid) {
  const r = await one("SELECT * FROM plugins WHERE rid = $1", [rid]);
  return r && plugin(r);
}
async function createPlugin(p2) {
  const r = await q(`INSERT INTO plugins (id, owner_user_id, name, author, description_json, icon, repo_url, repo_warning, repo_checked_at, created_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $9) ON CONFLICT (id) DO NOTHING RETURNING id`, [p2.id, p2.owner, p2.name, p2.author, JSON.stringify(p2.description), p2.icon, p2.repoUrl, p2.repoWarning, now()]);
  return r.length > 0;
}
async function updatePlugin(id, patch) {
  const sets = [];
  const params = [id];
  const add = (col, v2, cast = "") => {
    params.push(v2);
    sets.push(`${col} = $${params.length}${cast}`);
  };
  if (patch.name !== undefined)
    add("name", patch.name);
  if (patch.author !== undefined)
    add("author", patch.author);
  if (patch.description !== undefined)
    add("description_json", JSON.stringify(patch.description), "::jsonb");
  if (patch.icon !== undefined)
    add("icon", patch.icon);
  if (patch.hidden !== undefined)
    add("hidden", patch.hidden);
  if (patch.repoUrl !== undefined) {
    add("repo_url", patch.repoUrl);
    add("repo_checked_at", now());
  }
  if (patch.repoWarning !== undefined)
    add("repo_warning", patch.repoWarning);
  if (sets.length)
    await q(`UPDATE plugins SET ${sets.join(", ")} WHERE id = $1`, params);
}
async function deletePlugin(id) {
  await q("DELETE FROM plugins WHERE id = $1", [id]);
}
async function listPlugins(opts) {
  const where = opts.owner === undefined ? "" : "WHERE owner_user_id = $1";
  const args = opts.owner === undefined ? [] : [opts.owner];
  const total = Number((await one(`SELECT count(*) AS n FROM plugins ${where}`, args)).n);
  const rows = await q(`SELECT * FROM plugins ${where} ORDER BY created_at DESC, rid DESC LIMIT $${args.length + 1} OFFSET $${args.length + 2}`, [...args, opts.limit, opts.offset]);
  return { rows: rows.map(plugin), total };
}
async function allPlugins() {
  return (await q("SELECT * FROM plugins ORDER BY rid")).map(plugin);
}
async function listScreenshots(pluginId) {
  return (await q("SELECT * FROM screenshots WHERE plugin_id = $1 ORDER BY position, id", [pluginId])).map(screenshot);
}
async function getScreenshot(id) {
  const r = await one("SELECT * FROM screenshots WHERE id = $1", [id]);
  return r && screenshot(r);
}
async function publishedScreenshots() {
  const rows = await q("SELECT plugin_id, msg_id FROM screenshots WHERE msg_id IS NOT NULL ORDER BY plugin_id, position, id");
  const out = new Map;
  for (const r of rows)
    out.set(r.plugin_id, [...out.get(r.plugin_id) ?? [], Number(r.msg_id)]);
  return out;
}
async function addScreenshot(pluginId, fileId, uniqueId) {
  const r = await one(`INSERT INTO screenshots (plugin_id, position, file_id, file_unique_id, created_at)
     SELECT $1, COALESCE((SELECT max(position) + 1 FROM screenshots WHERE plugin_id = $1), 0), $2, $3, $4
     WHERE (SELECT count(*) FROM screenshots WHERE plugin_id = $1) < $5
     ON CONFLICT (plugin_id, file_unique_id) DO NOTHING RETURNING *`, [pluginId, fileId, uniqueId, now(), MAX_SCREENSHOTS]);
  if (r)
    return { ok: true, shot: screenshot(r) };
  const dup = await one("SELECT 1 FROM screenshots WHERE plugin_id = $1 AND file_unique_id = $2", [pluginId, uniqueId]);
  return { ok: false, reason: dup ? "duplicate" : "full" };
}
async function setScreenshotMsg(id, msgId) {
  await q("UPDATE screenshots SET msg_id = $2 WHERE id = $1", [id, msgId]);
}
async function normalizeScreenshots(pluginId) {
  await q(`UPDATE screenshots s SET position = r.n FROM
       (SELECT id, row_number() OVER (ORDER BY position, id) - 1 AS n FROM screenshots WHERE plugin_id = $1) r
     WHERE s.id = r.id AND s.position <> r.n`, [pluginId]);
}
async function removeScreenshot(id) {
  const r = await one("DELETE FROM screenshots WHERE id = $1 RETURNING *", [id]);
  if (!r)
    return null;
  const shot = screenshot(r);
  await normalizeScreenshots(shot.pluginId);
  return shot;
}
async function restoreScreenshot(shot) {
  await q("UPDATE screenshots SET position = position + 1 WHERE plugin_id = $1 AND position >= $2", [shot.pluginId, shot.position]);
  await q(`INSERT INTO screenshots (plugin_id, position, msg_id, file_id, file_unique_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (plugin_id, file_unique_id) DO NOTHING`, [shot.pluginId, shot.position, shot.msgId, shot.fileId, shot.uniqueId, now()]);
}
async function moveScreenshot(pluginId, id, dir) {
  await normalizeScreenshots(pluginId);
  const list = await listScreenshots(pluginId);
  const i = list.findIndex((s) => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length)
    return false;
  await q("UPDATE screenshots SET position = CASE id WHEN $1 THEN $3::int WHEN $2 THEN $4::int END WHERE id IN ($1, $2)", [
    list[i].id,
    list[j].id,
    list[j].position,
    list[i].position
  ]);
  return true;
}
async function dropPendingScreenshots(pluginId) {
  await q(`DELETE FROM screenshots WHERE plugin_id = $1 AND msg_id IS NULL
       AND NOT EXISTS (SELECT 1 FROM versions WHERE plugin_id = $1 AND status IN ('pending', 'publishing', 'approved', 'hidden'))`, [pluginId]);
}
async function appendWizardShot(userId, shot) {
  const r = await one(`UPDATE sessions SET payload_json = jsonb_set(payload_json, '{shots}', COALESCE(payload_json->'shots', '[]'::jsonb) || $2::jsonb), updated_at = $4
     WHERE user_id = $1 AND state = 'wiz'
       AND jsonb_array_length(COALESCE(payload_json->'shots', '[]'::jsonb)) < $3
       AND NOT (COALESCE(payload_json->'shots', '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('u', $5::text)))
     RETURNING payload_json`, [userId, JSON.stringify([shot]), MAX_SCREENSHOTS, now(), shot.u]);
  if (r)
    return { ok: true, shots: r.payload_json.shots, payload: r.payload_json };
  const s = await one("SELECT payload_json FROM sessions WHERE user_id = $1 AND state = 'wiz'", [userId]);
  if (!s)
    return { ok: false, reason: "gone" };
  const shots = s.payload_json.shots ?? [];
  return { ok: false, reason: shots.some((x2) => x2.u === shot.u) ? "duplicate" : "full" };
}
async function saveWizard(userId, payload) {
  await q(`INSERT INTO sessions (user_id, state, payload_json, updated_at) VALUES ($1, 'wiz', $2::jsonb, $3)
     ON CONFLICT (user_id) DO UPDATE SET state = 'wiz', updated_at = EXCLUDED.updated_at,
       payload_json = EXCLUDED.payload_json || jsonb_build_object('shots',
         CASE WHEN sessions.state = 'wiz' THEN COALESCE(sessions.payload_json->'shots', '[]'::jsonb) ELSE '[]'::jsonb END)`, [userId, JSON.stringify(payload), now()]);
}
async function createRepoChange(pluginId, repoUrl, warning, submitter) {
  const r = await one(`INSERT INTO repo_changes (plugin_id, repo_url, warning, status, submitter_id, created_at)
     VALUES ($1, $2, $3, 'pending', $4, $5) ON CONFLICT (plugin_id) WHERE status = 'pending' DO NOTHING RETURNING *`, [pluginId, repoUrl, warning, submitter, now()]);
  return r && repoChange(r);
}
async function getRepoChange(id) {
  const r = await one("SELECT * FROM repo_changes WHERE id = $1", [id]);
  return r && repoChange(r);
}
async function pendingRepoChange(pluginId) {
  const r = await one("SELECT * FROM repo_changes WHERE plugin_id = $1 AND status = 'pending'", [pluginId]);
  return r && repoChange(r);
}
async function decideRepoChange(id, status, reason) {
  const r = await one("UPDATE repo_changes SET status = $2, reject_reason = $3 WHERE id = $1 AND status = 'pending' RETURNING *", [id, status, reason ?? null]);
  return r && repoChange(r);
}
async function setRepoChangeMods(id, msgs) {
  await q("UPDATE repo_changes SET mod_msgs = $2::jsonb WHERE id = $1", [id, JSON.stringify(msgs)]);
}
async function listPendingRepoChanges(offset, limit) {
  const total = Number((await one("SELECT count(*) AS n FROM repo_changes WHERE status = 'pending'")).n);
  const rows = await q(`SELECT c.*, p.name AS plugin_name FROM repo_changes c JOIN plugins p ON p.id = c.plugin_id
     WHERE c.status = 'pending' ORDER BY c.created_at, c.id LIMIT $1 OFFSET $2`, [limit, offset]);
  return { rows: rows.map((r) => ({ ...repoChange(r), pluginName: r.plugin_name })), total };
}
async function getVersion(rid) {
  const r = await one("SELECT * FROM versions WHERE rid = $1", [rid]);
  return r && version(r);
}
async function listVersions(pluginId, opts) {
  const total = Number((await one("SELECT count(*) AS n FROM versions WHERE plugin_id = $1", [pluginId])).n);
  const rows = opts ? await q("SELECT * FROM versions WHERE plugin_id = $1 ORDER BY date DESC, rid DESC LIMIT $2 OFFSET $3", [pluginId, opts.limit, opts.offset]) : await q("SELECT * FROM versions WHERE plugin_id = $1 ORDER BY date DESC, rid DESC", [pluginId]);
  return { rows: rows.map(version), total };
}
async function allVersions() {
  return (await q("SELECT * FROM versions ORDER BY rid")).map(version);
}
async function liveVersionStrings(pluginId) {
  return (await q("SELECT version FROM versions WHERE plugin_id = $1 AND status <> 'rejected'", [pluginId])).map((r) => r.version);
}
async function approvedGrants(pluginId) {
  const rows = await q("SELECT grants_json FROM versions WHERE plugin_id = $1 AND status IN ('approved', 'hidden') AND grants_json IS NOT NULL", [pluginId]);
  return rows.map((r) => r.grants_json);
}
async function hasApproved(pluginId) {
  return !!await one("SELECT 1 FROM versions WHERE plugin_id = $1 AND status IN ('approved', 'hidden')", [pluginId]);
}
async function findBySha(sha) {
  const r = await one(`SELECT v.*, p.name AS plugin_name FROM versions v JOIN plugins p ON p.id = v.plugin_id
     WHERE v.file_sha256 = $1 AND v.status <> 'rejected' LIMIT 1`, [sha]);
  return r && { ...version(r), pluginName: r.plugin_name };
}
async function countSubmissionsSince(userId, since) {
  return Number((await one("SELECT count(*) AS n FROM versions WHERE submitter_id = $1 AND created_at >= $2", [userId, since])).n);
}
async function createVersion(v2) {
  await q("DELETE FROM versions WHERE plugin_id = $1 AND version = $2 AND status = 'rejected'", [v2.pluginId, v2.version]);
  const t = now();
  const r = await one(`INSERT INTO versions (plugin_id, version, date, changelog, grants_json, status, file_sha256, file_id, submitter_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, 'pending', $6, $7, $8, $3, $3) RETURNING *`, [v2.pluginId, v2.version, t, v2.changelog || null, v2.grants ? JSON.stringify(v2.grants) : null, v2.sha256, v2.fileId, v2.submitter]);
  return version(r);
}
async function claimVersion(rid, from) {
  const r = await one("UPDATE versions SET status = $3, updated_at = $2 WHERE rid = $1 AND status = $4 RETURNING *", [rid, now(), "publishing", from]);
  return r && version(r);
}
async function setVersionStatus(rid, status, extra = {}) {
  await q(`UPDATE versions SET status = $2, updated_at = $3,
       msg_id = CASE WHEN $4 THEN $5::int ELSE msg_id END,
       reject_reason = CASE WHEN $6 THEN $7 ELSE reject_reason END,
       date = COALESCE($8::bigint, date)
     WHERE rid = $1`, [
    rid,
    status,
    now(),
    extra.msgId !== undefined,
    extra.msgId ?? null,
    extra.rejectReason !== undefined,
    extra.rejectReason ?? null,
    extra.date ?? null
  ]);
}
async function setModMsgs(rid, msgs) {
  await q("UPDATE versions SET mod_msgs = $2::jsonb WHERE rid = $1", [rid, JSON.stringify(msgs)]);
}
async function deleteVersion(rid) {
  await q("DELETE FROM versions WHERE rid = $1", [rid]);
}
async function listPendingVersions(offset, limit) {
  const total = Number((await one("SELECT count(*) AS n FROM versions WHERE status = 'pending'")).n);
  const rows = await q(`SELECT v.*, p.name AS plugin_name FROM versions v JOIN plugins p ON p.id = v.plugin_id
     WHERE v.status = 'pending' ORDER BY v.created_at, v.rid LIMIT $1 OFFSET $2`, [limit, offset]);
  return { rows: rows.map((r) => ({ ...version(r), pluginName: r.plugin_name })), total };
}
async function recordInstall(userId, pluginId, ver) {
  const r = await q(`INSERT INTO installs (plugin_id, user_id, created_at)
     SELECT p.id, $2::bigint, $4::bigint FROM plugins p
     WHERE p.id = $1 AND NOT p.hidden
       AND EXISTS (SELECT 1 FROM versions v WHERE v.plugin_id = p.id AND v.version = $3 AND v.status = 'approved')
       AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = $2::bigint AND u.banned)
     ON CONFLICT DO NOTHING RETURNING plugin_id`, [pluginId, userId, ver, now()]);
  return r.length > 0;
}
async function installCounts() {
  const rows = await q("SELECT plugin_id, count(*) AS n FROM installs GROUP BY plugin_id");
  return new Map(rows.map((r) => [r.plugin_id, Number(r.n)]));
}
async function installCount(pluginId) {
  return Number((await one("SELECT count(*) AS n FROM installs WHERE plugin_id = $1", [pluginId])).n);
}
async function getMeta(key) {
  return (await one("SELECT value FROM meta WHERE key = $1", [key]))?.value ?? null;
}
async function setMeta(key, value) {
  await q("INSERT INTO meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [key, value]);
}
async function acquireLock(name, ttlSec, token) {
  const t = Date.now();
  const r = await q(`INSERT INTO meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
     WHERE split_part(meta.value, ':', 1)::bigint < $3 RETURNING key`, [name, `${t + ttlSec * 1000}:${token}`, t]);
  return r.length > 0;
}
async function releaseLock(name, token) {
  await q("DELETE FROM meta WHERE key = $1 AND value LIKE $2", [name, `%:${token}`]);
}
var SESSION_TTL_SEC = 15 * 60;
async function getSession(userId) {
  const r = await one("SELECT state, payload_json, updated_at FROM sessions WHERE user_id = $1", [userId]);
  if (!r)
    return null;
  if (Number(r.updated_at) < now() - SESSION_TTL_SEC) {
    await clearSession(userId);
    return null;
  }
  return { state: r.state, payload: r.payload_json };
}
async function setSession(userId, state, payload = {}) {
  await q(`INSERT INTO sessions (user_id, state, payload_json, updated_at) VALUES ($1, $2, $3::jsonb, $4)
     ON CONFLICT (user_id) DO UPDATE SET state = EXCLUDED.state, payload_json = EXCLUDED.payload_json, updated_at = EXCLUDED.updated_at`, [userId, state, JSON.stringify(payload), now()]);
}
async function clearSession(userId) {
  return (await q("DELETE FROM sessions WHERE user_id = $1 RETURNING user_id", [userId])).length > 0;
}
async function markUpdateProcessed(updateId) {
  const r = await q("INSERT INTO processed_updates (update_id, created_at) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING update_id", [updateId, now()]);
  return r.length > 0;
}
async function enqueueJob(type) {
  await q("INSERT INTO jobs (type, created_at) VALUES ($1, $2) ON CONFLICT (type) WHERE status = 'pending' DO NOTHING", [type, now()]);
}
async function dumpAll() {
  const out = {};
  for (const t of ["users", "plugins", "versions", "repo_changes", "screenshots", "installs", "meta", "sessions"]) {
    out[t] = await q(`SELECT * FROM ${t}`);
  }
  return out;
}

// src/publish.ts
var LOCK = "rebuild_lock";
var LOCK_TTL_SEC = 55;
var errText = (e) => e?.description ?? (e instanceof Error ? e.message : String(e));
var gone = (e) => /message to (edit|delete) not found|MESSAGE_ID_INVALID|message can't be deleted/i.test(errText(e));
var notModified = (e) => /message is not modified/i.test(errText(e));
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function writeCatalogMessage(api, json) {
  const chat = config().channelId;
  const media = () => new import_grammy.InputFile(new TextEncoder().encode(json), "catalog.json");
  const id = await getMeta("catalog_msg_id");
  if (id) {
    try {
      await api.editMessageMedia(chat, Number(id), { type: "document", media: media(), caption: "#catalog" });
      return;
    } catch (e) {
      if (notModified(e))
        return;
      if (!gone(e))
        throw e;
    }
  }
  const sent = await api.sendDocument(chat, media(), { caption: "#catalog", disable_notification: true });
  await api.pinChatMessage(chat, sent.message_id, { disable_notification: true });
  await setMeta("catalog_msg_id", String(sent.message_id));
}
async function rebuildLocked(api, force) {
  const [plugins, versions, installs, shots] = await Promise.all([allPlugins(), allVersions(), installCounts(), publishedScreenshots()]);
  const catalog = buildCatalog(plugins.map((p2) => ({ id: p2.id, name: p2.name, author: p2.author, description: p2.description, icon: p2.icon, repo: p2.repoUrl, hidden: p2.hidden })), versions.map((v2) => ({
    pluginId: v2.pluginId,
    version: v2.version,
    msgId: v2.msgId,
    date: v2.date,
    changelog: v2.changelog,
    grants: v2.grants,
    status: v2.status
  })), installs, now(), shots);
  const fingerprint = catalogFingerprint(catalog);
  if (!force && await getMeta("catalog_hash") === fingerprint && await getMeta("catalog_msg_id"))
    return false;
  await writeCatalogMessage(api, serializeCatalog(catalog));
  await setMeta("catalog_hash", fingerprint);
  return true;
}
async function refreshCatalog(api, opts = {}) {
  const token = crypto.randomUUID();
  const deadline = Date.now() + (opts.waitMs ?? 8000);
  while (!await acquireLock(LOCK, LOCK_TTL_SEC, token)) {
    if (Date.now() >= deadline) {
      await enqueueJob("rebuild");
      return "queued";
    }
    await sleep(400);
  }
  try {
    return await rebuildLocked(api, !!opts.force) ? "done" : "unchanged";
  } finally {
    await releaseLock(LOCK, token).catch(() => {});
  }
}
var caption = (name, version2, id) => `#plugin ${name} ${version2}
${id}`;

class PublishError extends Error {
}
var shotCaption = (pluginId) => `#screenshot ${pluginId}`;
async function publishOneScreenshot(api, pluginId, shot) {
  const sent = await api.sendPhoto(config().channelId, shot.fileId, { caption: shotCaption(pluginId), disable_notification: true });
  await setScreenshotMsg(shot.id, sent.message_id);
  shot.msgId = sent.message_id;
  return sent.message_id;
}
async function discardScreenshots(api, shots) {
  for (const s of shots) {
    if (s.msgId !== null)
      await deleteChannelMessage(api, s.msgId).catch(() => {});
    await setScreenshotMsg(s.id, null).catch(() => {});
    s.msgId = null;
  }
}
async function sendPendingScreenshots(api, pluginId) {
  const sent = [];
  try {
    for (const s of await listScreenshots(pluginId)) {
      if (s.msgId !== null)
        continue;
      await publishOneScreenshot(api, pluginId, s);
      sent.push(s);
    }
    return sent;
  } catch (e) {
    await discardScreenshots(api, sent);
    throw e;
  }
}
async function publishVersion(api, rid, from) {
  const v2 = await claimVersion(rid, from);
  if (!v2)
    throw new PublishError("\u0412\u0435\u0440\u0441\u0438\u044F \u0443\u0436\u0435 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u0430 \u0438\u043B\u0438 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430");
  const p2 = await getPlugin(v2.pluginId);
  if (!p2) {
    await setVersionStatus(rid, from);
    throw new PublishError("\u041F\u043B\u0430\u0433\u0438\u043D \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
  }
  const chat = config().channelId;
  let msgId;
  let shots = [];
  try {
    const sent = await api.sendDocument(chat, v2.fileId, { caption: caption(p2.name, v2.version, p2.id), disable_notification: true });
    msgId = sent.message_id;
    await setVersionStatus(rid, "approved", { msgId, date: now() });
    shots = await sendPendingScreenshots(api, p2.id);
    const r = await refreshCatalog(api);
    return { queued: r === "queued" };
  } catch (e) {
    log("error", "publish failed", { rid, error: errText(e) });
    if (msgId !== undefined)
      await api.deleteMessage(chat, msgId).catch(() => {});
    await discardScreenshots(api, shots);
    await setVersionStatus(rid, from, { msgId: null }).catch(() => {});
    throw new PublishError(`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C: ${errText(e)}`);
  }
}
async function deleteChannelMessage(api, msgId) {
  if (msgId === null)
    return;
  try {
    await api.deleteMessage(config().channelId, msgId);
  } catch (e) {
    if (!gone(e))
      throw e;
  }
}
async function unpublishVersion(api, rid, mode) {
  const v2 = await getVersion(rid);
  if (!v2)
    return;
  if (v2.status !== "approved") {
    if (mode === "delete") {
      await deleteVersion(rid);
      await dropPendingScreenshots(v2.pluginId);
    } else
      await setVersionStatus(rid, "hidden");
    return;
  }
  await setVersionStatus(rid, "hidden");
  const r = await refreshCatalog(api, { waitMs: 20000 });
  if (r === "queued") {
    await setVersionStatus(rid, "approved");
    throw new PublishError("\u041A\u0430\u0442\u0430\u043B\u043E\u0433 \u0441\u0435\u0439\u0447\u0430\u0441 \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u0435\u0442\u0441\u044F, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 \u043C\u0438\u043D\u0443\u0442\u0443");
  }
  await deleteChannelMessage(api, v2.msgId);
  await setVersionStatus(rid, "hidden", { msgId: null });
  if (mode === "delete")
    await deleteVersion(rid);
}
async function removePlugin(api, pluginId) {
  const p2 = await getPlugin(pluginId);
  if (!p2)
    return;
  const { rows } = await listVersions(pluginId);
  const shots = await listScreenshots(pluginId);
  await updatePlugin(pluginId, { hidden: true });
  const r = await refreshCatalog(api, { waitMs: 20000 });
  if (r === "queued") {
    await updatePlugin(pluginId, { hidden: p2.hidden });
    throw new PublishError("\u041A\u0430\u0442\u0430\u043B\u043E\u0433 \u0441\u0435\u0439\u0447\u0430\u0441 \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u0435\u0442\u0441\u044F, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 \u043C\u0438\u043D\u0443\u0442\u0443");
  }
  for (const v2 of rows)
    await deleteChannelMessage(api, v2.msgId);
  for (const s of shots)
    await deleteChannelMessage(api, s.msgId);
  await deletePlugin(pluginId);
}
async function refreshAfterEdit(api) {
  return refreshCatalog(api);
}

// src/repo-change.ts
var import_grammy2 = __toESM(require_mod(), 1);

// src/repo.ts
import { lookup } from "dns/promises";
import { isIP } from "net";
var DEFAULT_REPO_HOSTS = ["github.com", "gitlab.com", "codeberg.org", "bitbucket.org", "git.sr.ht", "gitea.com"];
var MAX_REPO_LENGTH = 200;
function allowedHosts(env = process.env.REPO_HOSTS) {
  const extra = (env ?? "").split(",").map((h2) => h2.trim().toLowerCase()).filter(Boolean);
  return extra.length ? extra : DEFAULT_REPO_HOSTS;
}
function normalizeRepo(raw, hosts = allowedHosts()) {
  const text = raw.trim();
  if (!text)
    return { ok: false, error: "\u0441\u0441\u044B\u043B\u043A\u0430 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043F\u0443\u0441\u0442\u043E\u0439" };
  if (/\s/.test(text))
    return { ok: false, error: "\u0432 \u0441\u0441\u044B\u043B\u043A\u0435 \u043D\u0435 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043F\u0440\u043E\u0431\u0435\u043B\u043E\u0432" };
  if (text.length > MAX_REPO_LENGTH + 20)
    return { ok: false, error: `\u0441\u0441\u044B\u043B\u043A\u0430 \u0434\u043B\u0438\u043D\u043D\u0435\u0435 ${MAX_REPO_LENGTH} \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432` };
  let u;
  try {
    u = new URL(text);
  } catch {
    return { ok: false, error: "\u044D\u0442\u043E \u043D\u0435 \u043F\u043E\u0445\u043E\u0436\u0435 \u043D\u0430 \u0441\u0441\u044B\u043B\u043A\u0443, \u043D\u0443\u0436\u0435\u043D \u0430\u0434\u0440\u0435\u0441 \u0432\u0438\u0434\u0430 https://github.com/\u0430\u0432\u0442\u043E\u0440/\u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439" };
  }
  if (u.protocol !== "https:")
    return { ok: false, error: "\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u0441\u044B\u043B\u043A\u0438 https://" };
  if (u.username || u.password)
    return { ok: false, error: "\u0432 \u0441\u0441\u044B\u043B\u043A\u0435 \u043D\u0435 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043B\u043E\u0433\u0438\u043D\u0430 \u0438 \u043F\u0430\u0440\u043E\u043B\u044F" };
  if (u.port && u.port !== "443")
    return { ok: false, error: "\u043D\u0435\u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u044B\u0435 \u043F\u043E\u0440\u0442\u044B \u043D\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u044B" };
  const host = u.hostname.toLowerCase();
  if (!hosts.includes(host))
    return { ok: false, error: `\u0445\u043E\u0441\u0442 ${host} \u043D\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0451\u043D (\u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u044B: ${hosts.join(", ")})` };
  const segments = u.pathname.split("/").filter(Boolean);
  if (segments.length < 2)
    return { ok: false, error: "\u0432 \u0441\u0441\u044B\u043B\u043A\u0435 \u0434\u043E\u043B\u0436\u043D\u044B \u0431\u044B\u0442\u044C \u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u0438 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439: https://\u0445\u043E\u0441\u0442/\u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446/\u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439" };
  const url = `https://${host}/${segments.join("/")}${u.search}`;
  if (url.length > MAX_REPO_LENGTH)
    return { ok: false, error: `\u0441\u0441\u044B\u043B\u043A\u0430 \u0434\u043B\u0438\u043D\u043D\u0435\u0435 ${MAX_REPO_LENGTH} \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432` };
  return { ok: true, value: url };
}
function isPublicIp(ip) {
  const kind = isIP(ip);
  if (kind === 4) {
    const [a2, b2] = ip.split(".").map(Number);
    if (a2 === 0 || a2 === 10 || a2 === 127)
      return false;
    if (a2 === 100 && b2 >= 64 && b2 <= 127)
      return false;
    if (a2 === 169 && b2 === 254)
      return false;
    if (a2 === 172 && b2 >= 16 && b2 <= 31)
      return false;
    if (a2 === 192 && (b2 === 168 || b2 === 0 && ip.split(".")[2] === "0"))
      return false;
    if (a2 === 198 && (b2 === 18 || b2 === 19))
      return false;
    if (a2 >= 224)
      return false;
    return true;
  }
  if (kind === 6) {
    const v2 = ip.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v2);
    if (mapped)
      return isPublicIp(mapped[1]);
    if (v2 === "::" || v2 === "::1")
      return false;
    if (/^f[cd]/.test(v2))
      return false;
    if (/^fe[89ab]/.test(v2))
      return false;
    if (v2.startsWith("ff"))
      return false;
    return true;
  }
  return false;
}
var defaultResolve = async (host) => (await lookup(host, { all: true })).map((a2) => a2.address);
async function checkRepo(url, deps = {}) {
  const doFetch = deps.fetch ?? fetch;
  const resolve = deps.resolve ?? defaultResolve;
  const hosts = deps.hosts ?? allowedHosts();
  const signal = AbortSignal.timeout(deps.timeoutMs ?? 3000);
  let current = url;
  try {
    for (let hop = 0;hop <= 2; hop++) {
      const u = new URL(current);
      if (u.protocol !== "https:" || !hosts.includes(u.hostname.toLowerCase()))
        return { status: "unreachable", detail: "\u0440\u0435\u0434\u0438\u0440\u0435\u043A\u0442 \u043D\u0430 \u043D\u0435\u0440\u0430\u0437\u0440\u0435\u0448\u0451\u043D\u043D\u044B\u0439 \u0445\u043E\u0441\u0442" };
      const ips = isIP(u.hostname) ? [u.hostname] : await resolve(u.hostname);
      if (!ips.length || !ips.every(isPublicIp))
        return { status: "unreachable", detail: "\u0430\u0434\u0440\u0435\u0441 \u0445\u043E\u0441\u0442\u0430 \u043D\u0435 \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u044B\u0439" };
      let res = await doFetch(current, { method: "HEAD", redirect: "manual", signal });
      if (res.status === 405 || res.status === 501)
        res = await doFetch(current, { method: "GET", redirect: "manual", signal });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc)
          return { status: "unreachable", detail: "\u0440\u0435\u0434\u0438\u0440\u0435\u043A\u0442 \u0431\u0435\u0437 \u0430\u0434\u0440\u0435\u0441\u0430" };
        current = new URL(loc, current).toString();
        continue;
      }
      if (res.status === 404 || res.status === 410)
        return { status: "not_found" };
      if (res.status >= 200 && res.status < 300)
        return { status: "ok" };
      return { status: "unreachable", detail: `\u043E\u0442\u0432\u0435\u0442 ${res.status}` };
    }
    return { status: "unreachable", detail: "\u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0440\u0435\u0434\u0438\u0440\u0435\u043A\u0442\u043E\u0432" };
  } catch (e) {
    return { status: "unreachable", detail: e?.name === "TimeoutError" ? "\u0442\u0430\u0439\u043C\u0430\u0443\u0442" : "\u043D\u0435\u0442 \u043E\u0442\u0432\u0435\u0442\u0430" };
  }
}
var repoWarningText = (s) => s.status === "ok" ? null : s.status === "not_found" ? "\u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D (404)" : `\u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D: ${s.detail}`;

// src/text.ts
var esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function grantsBlock(grants, risk) {
  if (grants === null)
    return "\uD83D\uDD10 \u0413\u0440\u0430\u043D\u0442\u044B: <i>\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B</i> (\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u043D\u0435 \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u043D)";
  if (!grants.length)
    return "\uD83D\uDD10 \u0413\u0440\u0430\u043D\u0442\u044B: \u043D\u0435\u0442";
  const lines = grants.map((g) => {
    const mark = g.startsWith("unsafe.") ? "\uD83D\uDEA8" : risk.risky.includes(g) ? "\u26A0\uFE0F" : "\u2022";
    return `${mark} <code>${esc(g)}</code>`;
  });
  return `\uD83D\uDD10 \u0413\u0440\u0430\u043D\u0442\u044B:
${lines.join(`
`)}`;
}
function when(ts2) {
  return new Date(ts2 * 1000).toISOString().slice(0, 10);
}
var STATUS_ICON = {
  approved: "\u2705",
  pending: "\u23F3",
  rejected: "\u274C",
  hidden: "\uD83D\uDE48",
  publishing: "\u23F3"
};
var STATUS_NAME = {
  approved: "\u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u0430",
  pending: "\u043D\u0430 \u043C\u043E\u0434\u0435\u0440\u0430\u0446\u0438\u0438",
  rejected: "\u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0430",
  hidden: "\u0441\u043A\u0440\u044B\u0442\u0430",
  publishing: "\u043F\u0443\u0431\u043B\u0438\u043A\u0443\u0435\u0442\u0441\u044F"
};

// src/repo-change.ts
async function requestRepoChange(api, plugin2, raw, submitter, opts = {}) {
  const v2 = normalizeRepo(raw);
  if (!v2.ok)
    return { kind: "error", message: v2.error };
  if (v2.value === plugin2.repoUrl)
    return { kind: "error", message: "\u042D\u0442\u043E\u0442 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 \u0443\u0436\u0435 \u0443\u043A\u0430\u0437\u0430\u043D" };
  if (await pendingRepoChange(plugin2.id))
    return { kind: "error", message: "\u0417\u0430\u044F\u0432\u043A\u0430 \u043D\u0430 \u0441\u043C\u0435\u043D\u0443 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u044F \u0443\u0436\u0435 \u043D\u0430 \u0440\u0430\u0441\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u0438\u0438" };
  let warning = null;
  const status = await checkRepo(v2.value, opts.check);
  if (status.status === "not_found") {
    if (!opts.confirmed)
      return { kind: "confirm", url: v2.value, message: "\u0420\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D (404). \u0422\u043E\u0447\u043D\u043E \u044D\u0442\u0430 \u0441\u0441\u044B\u043B\u043A\u0430?" };
    warning = "\u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D (404), \u0430\u0432\u0442\u043E\u0440 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043B \u0441\u0441\u044B\u043B\u043A\u0443";
  } else {
    warning = repoWarningText(status);
  }
  if (!plugin2.repoUrl || !config().moderation) {
    await updatePlugin(plugin2.id, { repoUrl: v2.value, repoWarning: warning });
    await refreshCatalog(api).catch((e) => log("warn", "catalog refresh after repo change failed", { error: errText(e) }));
    return { kind: "applied" };
  }
  const change = await createRepoChange(plugin2.id, v2.value, warning, submitter);
  if (!change)
    return { kind: "error", message: "\u0417\u0430\u044F\u0432\u043A\u0430 \u043D\u0430 \u0441\u043C\u0435\u043D\u0443 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u044F \u0443\u0436\u0435 \u043D\u0430 \u0440\u0430\u0441\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u0438\u0438" };
  await notifyModerators(api, change, plugin2);
  return { kind: "pending" };
}
function repoChangeCard(c, plugin2) {
  return [
    `\uD83D\uDD17 <b>\u0421\u043C\u0435\u043D\u0430 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u044F:</b> ${esc(plugin2.name)}`,
    `id: <code>${esc(plugin2.id)}</code> \xB7 \u0430\u0432\u0442\u043E\u0440: ${esc(plugin2.author)} (<code>${c.submitter}</code>)`,
    `\u0431\u044B\u043B\u043E: ${plugin2.repoUrl ? `<a href="${esc(plugin2.repoUrl)}">${esc(plugin2.repoUrl)}</a>` : "\u2014"}`,
    `\u0441\u0442\u0430\u043D\u0435\u0442: <a href="${esc(c.repoUrl)}">${esc(c.repoUrl)}</a>`,
    c.warning ? `\u26A0\uFE0F ${esc(c.warning)}` : ""
  ].filter(Boolean).join(`
`);
}
var repoChangeKeyboard = (id) => new import_grammy2.InlineKeyboard().text("\u2705 \u041E\u0434\u043E\u0431\u0440\u0438\u0442\u044C", `a:rok:${id}`).text("\u274C \u041E\u0442\u043A\u043B\u043E\u043D\u0438\u0442\u044C", `a:rno:${id}`);
async function notifyModerators(api, c, plugin2) {
  const cfg = config();
  const sent = [];
  for (const chat of cfg.modChatId ? [cfg.modChatId] : cfg.adminIds) {
    try {
      const m = await api.sendMessage(chat, repoChangeCard(c, plugin2), {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
        reply_markup: repoChangeKeyboard(c.id)
      });
      sent.push({ chat, msg: m.message_id });
    } catch (e) {
      log("warn", "cannot notify moderator about repo change", { chat, error: errText(e) });
    }
  }
  await setRepoChangeMods(c.id, sent);
}
async function closeCards(api, c, plugin2, status) {
  for (const m of c.modMsgs) {
    await api.editMessageText(m.chat, m.msg, `${repoChangeCard(c, plugin2)}

${status}`, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_markup: { inline_keyboard: [] }
    }).catch(() => {});
  }
}
async function approveRepoChange(api, id, modName) {
  const c = await decideRepoChange(id, "approved");
  if (!c)
    return { ok: false, message: "\u0417\u0430\u044F\u0432\u043A\u0430 \u0443\u0436\u0435 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u0430" };
  const plugin2 = await getPlugin(c.pluginId);
  if (!plugin2)
    return { ok: false, message: "\u041F\u043B\u0430\u0433\u0438\u043D \u0443\u0434\u0430\u043B\u0451\u043D" };
  await updatePlugin(plugin2.id, { repoUrl: c.repoUrl, repoWarning: c.warning });
  await refreshCatalog(api).catch((e) => log("warn", "catalog refresh after repo approval failed", { error: errText(e) }));
  await closeCards(api, c, plugin2, `\u2705 \u041E\u0434\u043E\u0431\u0440\u0435\u043D\u043E ${esc(modName)}`);
  await api.sendMessage(c.submitter, `\u2705 \u041D\u043E\u0432\u044B\u0439 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 \u043F\u043B\u0430\u0433\u0438\u043D\u0430 ${plugin2.name} \u043E\u0434\u043E\u0431\u0440\u0435\u043D:
${c.repoUrl}`).catch(() => {});
  return { ok: true, message: "\u041E\u0434\u043E\u0431\u0440\u0435\u043D\u043E" };
}
async function rejectRepoChange(api, id, reason, modName) {
  const c = await decideRepoChange(id, "rejected", reason);
  if (!c)
    return { ok: false, message: "\u0417\u0430\u044F\u0432\u043A\u0430 \u0443\u0436\u0435 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u0430" };
  const plugin2 = await getPlugin(c.pluginId);
  if (plugin2)
    await closeCards(api, c, plugin2, `\u274C \u041E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u043E ${esc(modName)}: ${esc(reason)}`);
  await api.sendMessage(c.submitter, `\u274C \u0421\u043C\u0435\u043D\u0430 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u044F \u043F\u043B\u0430\u0433\u0438\u043D\u0430 ${plugin2?.name ?? c.pluginId} \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0430.
\u041F\u0440\u0438\u0447\u0438\u043D\u0430: ${reason}
\u0412 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435 \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u043F\u0440\u0435\u0436\u043D\u044F\u044F \u0441\u0441\u044B\u043B\u043A\u0430.`).catch(() => {});
  return { ok: true, message: "\u041E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u043E" };
}

// src/submit.ts
var import_grammy3 = __toESM(require_mod(), 1);
async function checkTarget(userId, id, ver) {
  const existing = await getPlugin(id);
  if (existing && existing.owner !== userId)
    return `id \xAB${id}\xBB \u0443\u0436\u0435 \u0437\u0430\u043D\u044F\u0442 \u0434\u0440\u0443\u0433\u0438\u043C \u0430\u0432\u0442\u043E\u0440\u043E\u043C`;
  if (existing && ver) {
    const top = maxSemver(await liveVersionStrings(id));
    if (top && compareSemver(ver, top) <= 0)
      return `\u0432\u0435\u0440\u0441\u0438\u044F \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u0433\u043E \u0431\u043E\u043B\u044C\u0448\u0435 \u0442\u0435\u043A\u0443\u0449\u0435\u0439 (${top})`;
  }
  return null;
}
function needsModeration(opts) {
  if (!config().moderation)
    return { required: false, reasons: [] };
  const reasons = [];
  if (!opts.hasApproved)
    reasons.push("\u043D\u043E\u0432\u044B\u0439 \u043F\u043B\u0430\u0433\u0438\u043D");
  if (opts.grants === null)
    reasons.push("\u0433\u0440\u0430\u043D\u0442\u044B \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B");
  const fresh = newUnsafe(opts.grants, opts.previousGrants);
  if (fresh.length)
    reasons.push(`\u043D\u043E\u0432\u044B\u0435 \u043E\u043F\u0430\u0441\u043D\u044B\u0435 \u0433\u0440\u0430\u043D\u0442\u044B: ${fresh.join(", ")}`);
  return { required: reasons.length > 0, reasons };
}
async function submit(api, input) {
  const { userId, file, header, fields: f } = input;
  if (await isBanned(userId))
    return { kind: "error", message: "\u0412\u044B \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u044B" };
  if (!isAdmin(userId)) {
    const used = await countSubmissionsSince(userId, now() - 86400);
    if (used >= config().dailyLimit)
      return { kind: "error", message: `\u041B\u0438\u043C\u0438\u0442: \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 ${config().dailyLimit} \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0439 \u0432 \u0441\u0443\u0442\u043A\u0438` };
  }
  const dup = await findBySha(file.sha);
  if (dup)
    return { kind: "error", message: `\u042D\u0442\u043E\u0442 \u0444\u0430\u0439\u043B \u0443\u0436\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D: ${dup.pluginName} ${dup.version}` };
  const problem = await checkTarget(userId, f.id, f.version);
  if (problem)
    return { kind: "error", message: problem };
  const known = await getPlugin(f.id);
  let repo = known?.repoUrl ?? null;
  let repoIsNew = false;
  if (!repo) {
    const v2 = normalizeRepo(f.repo ?? "");
    if (!v2.ok)
      return { kind: "error", message: `\u0420\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439: ${v2.error}` };
    repo = v2.value;
    repoIsNew = true;
  }
  const created = await createPlugin({
    id: f.id,
    owner: userId,
    name: f.name,
    author: f.author,
    description: f.description,
    icon: f.icon,
    repoUrl: repo,
    repoWarning: input.repoWarning ?? null
  });
  if (!created && (await getPlugin(f.id))?.owner !== userId)
    return { kind: "error", message: `id \xAB${f.id}\xBB \u0443\u0436\u0435 \u0437\u0430\u043D\u044F\u0442 \u0434\u0440\u0443\u0433\u0438\u043C \u0430\u0432\u0442\u043E\u0440\u043E\u043C` };
  if (created) {
    for (const s of (input.screenshots ?? []).slice(0, MAX_SCREENSHOTS))
      await addScreenshot(f.id, s.id, s.u);
  }
  if (!created && repoIsNew) {
    await updatePlugin(f.id, { repoUrl: repo, repoWarning: input.repoWarning ?? null });
    refreshCatalog(api, { waitMs: 0 }).catch(() => {});
  }
  const grants = header ? header.grants : null;
  let version2;
  try {
    version2 = await createVersion({
      pluginId: f.id,
      version: f.version,
      changelog: f.changelog,
      grants,
      sha256: file.sha,
      fileId: file.id,
      submitter: userId
    });
  } catch (e) {
    if (created)
      await deletePlugin(f.id).catch(() => {});
    return { kind: "error", message: /unique/i.test(errText(e)) ? "\u0422\u0430\u043A\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442" : errText(e) };
  }
  const decision = needsModeration({
    grants,
    hasApproved: await hasApproved(f.id),
    previousGrants: await approvedGrants(f.id)
  });
  if (decision.required) {
    await notifyModerators2(api, version2, decision.reasons);
    return { kind: "pending" };
  }
  try {
    const { queued } = await publishVersion(api, version2.rid, "pending");
    return { kind: "published", queued };
  } catch (e) {
    await deleteVersion(version2.rid).catch(() => {});
    if (created)
      await deletePlugin(f.id).catch(() => {});
    await alertAdmins(api, `\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438 ${f.id} ${f.version}: ${errText(e)}`);
    return { kind: "error", message: errText(e) };
  }
}
function repoLines(p2) {
  return [
    p2.repoUrl ? `\uD83D\uDD17 <a href="${esc(p2.repoUrl)}">${esc(p2.repoUrl)}</a>` : "\uD83D\uDD17 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D",
    p2.repoWarning ? `\u26A0\uFE0F ${esc(p2.repoWarning)}` : ""
  ];
}
function modCard(v2, p2, reasons) {
  const risk = analyzeGrants(v2.grants);
  return [
    `\uD83D\uDCE5 <b>\u0417\u0430\u044F\u0432\u043A\u0430:</b> ${esc(p2.name)} <code>${esc(v2.version)}</code>`,
    `id: <code>${esc(p2.id)}</code> \xB7 \u0430\u0432\u0442\u043E\u0440: ${esc(p2.author)} (<code>${v2.submitter}</code>)`,
    ...repoLines(p2),
    reasons.length ? `\u041F\u0440\u0438\u0447\u0438\u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438: ${esc(reasons.join("; "))}` : "",
    grantsBlock(v2.grants, risk),
    v2.changelog ? `Changelog: ${esc(v2.changelog)}` : ""
  ].filter(Boolean).join(`
`);
}
function modKeyboard(rid) {
  return new import_grammy3.InlineKeyboard().text("\u2705 \u041E\u0434\u043E\u0431\u0440\u0438\u0442\u044C", `a:ok:${rid}`).text("\u274C \u041E\u0442\u043A\u043B\u043E\u043D\u0438\u0442\u044C", `a:no:${rid}`);
}
async function notifyModerators2(api, v2, reasons) {
  const p2 = await getPlugin(v2.pluginId);
  if (!p2)
    return;
  const cfg = config();
  const targets = cfg.modChatId ? [cfg.modChatId] : cfg.adminIds;
  const sent = [];
  const shots = await listScreenshots(v2.pluginId);
  for (const chat of targets) {
    try {
      if (shots.length === 1)
        await api.sendPhoto(chat, shots[0].fileId, { caption: `\uD83D\uDDBC \u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442: ${p2.name}` });
      else if (shots.length > 1)
        await api.sendMediaGroup(chat, shots.map((s) => ({ type: "photo", media: s.fileId })));
      const m = await api.sendDocument(chat, v2.fileId, {
        caption: modCard(v2, p2, reasons),
        parse_mode: "HTML",
        reply_markup: modKeyboard(v2.rid)
      });
      sent.push({ chat, msg: m.message_id });
    } catch (e) {
      log("warn", "cannot notify moderator", { chat, error: errText(e) });
    }
  }
  await setModMsgs(v2.rid, sent);
  if (!sent.length)
    log("error", "no moderator reachable", { rid: v2.rid });
}
async function alertAdmins(api, text) {
  log("error", text);
  for (const id of config().adminIds)
    await api.sendMessage(id, `\u26A0\uFE0F ${text}`).catch(() => {});
}
async function closeModCards(api, v2, status) {
  const p2 = await getPlugin(v2.pluginId);
  const base = p2 ? modCard(v2, p2, []) : "";
  for (const m of v2.modMsgs) {
    await api.editMessageCaption(m.chat, m.msg, {
      caption: `${base}

${status}`,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [] }
    }).catch(() => {});
  }
}
async function approve(api, rid, modName) {
  const v2 = await getVersion(rid);
  if (!v2 || v2.status !== "pending")
    return { ok: false, message: "\u0417\u0430\u044F\u0432\u043A\u0430 \u0443\u0436\u0435 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u0430" };
  try {
    await publishVersion(api, rid, "pending");
  } catch (e) {
    await alertAdmins(api, `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C ${v2.pluginId} ${v2.version}: ${errText(e)}`);
    return { ok: false, message: errText(e) };
  }
  await closeModCards(api, v2, `\u2705 \u041E\u0434\u043E\u0431\u0440\u0435\u043D\u043E ${esc(modName)}`);
  await api.sendMessage(v2.submitter, `\u2705 \u0412\u0430\u0448\u0430 \u0432\u0435\u0440\u0441\u0438\u044F ${v2.pluginId} ${v2.version} \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u0430 \u0438 \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u0430.`).catch(() => {});
  return { ok: true, message: "\u041E\u0434\u043E\u0431\u0440\u0435\u043D\u043E" };
}
async function reject(api, rid, reason, modName) {
  const v2 = await getVersion(rid);
  if (!v2 || v2.status !== "pending")
    return { ok: false, message: "\u0417\u0430\u044F\u0432\u043A\u0430 \u0443\u0436\u0435 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u0430" };
  await setVersionStatus(rid, "rejected", { rejectReason: reason });
  await dropPendingScreenshots(v2.pluginId);
  await closeModCards(api, v2, `\u274C \u041E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u043E ${esc(modName)}: ${esc(reason)}`);
  await api.sendMessage(v2.submitter, `\u274C \u0412\u0435\u0440\u0441\u0438\u044F ${v2.pluginId} ${v2.version} \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0430.
\u041F\u0440\u0438\u0447\u0438\u043D\u0430: ${reason}`).catch(() => {});
  return { ok: true, message: "\u041E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u043E" };
}

// src/ui.ts
var import_grammy4 = __toESM(require_mod(), 1);
var PAGE_SIZE = 8;

class Stale extends Error {
  constructor(message = "\u0423\u0441\u0442\u0430\u0440\u0435\u043B\u043E, \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043C\u0435\u043D\u044E \u0437\u0430\u043D\u043E\u0432\u043E") {
    super(message);
  }
}
var pageCount = (total) => Math.max(1, Math.ceil(total / PAGE_SIZE));
var clampPage = (page, total) => Math.min(Math.max(0, Number.isFinite(page) ? page : 0), pageCount(total) - 1);
function pagerRow(kb, prefix, page, total) {
  const pages = pageCount(total);
  if (pages <= 1)
    return kb;
  if (page > 0)
    kb.text("\u2039", `${prefix}:${page - 1}`);
  kb.text(`${page + 1}/${pages}`, "x:noop");
  if (page < pages - 1)
    kb.text("\u203A", `${prefix}:${page + 1}`);
  return kb.row();
}
function nav(kb, back) {
  if (back)
    kb.text("\u2039 \u041D\u0430\u0437\u0430\u0434", back);
  return kb.text("\u2302 \u041C\u0435\u043D\u044E", "m:home").row();
}
function homeKeyboard(userId) {
  const kb = new import_grammy4.InlineKeyboard().text("\uD83D\uDCE4 \u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C \u043F\u043B\u0430\u0433\u0438\u043D", "w:pub").row().text("\uD83D\uDCE6 \u041C\u043E\u0438 \u043F\u043B\u0430\u0433\u0438\u043D\u044B", "p:list:0").row().text("\u2139\uFE0F \u041F\u043E\u043C\u043E\u0449\u044C", "m:help").row();
  if (isAdmin(userId))
    kb.text("\uD83D\uDEE1 \u041C\u043E\u0434\u0435\u0440\u0430\u0446\u0438\u044F", "a:home").row();
  return kb;
}
var OPTS = { parse_mode: "HTML", link_preview_options: { is_disabled: true } };
var notModified2 = (e) => /message is not modified/i.test(errText(e));
async function screen(ctx, text, kb) {
  const msg = ctx.callbackQuery?.message;
  if (msg) {
    try {
      if ("document" in msg && msg.document) {
        await ctx.editMessageCaption({ caption: text.slice(0, 1024), reply_markup: kb, parse_mode: "HTML" });
      } else {
        await ctx.editMessageText(text, { ...OPTS, reply_markup: kb });
      }
      return;
    } catch (e) {
      if (notModified2(e))
        return;
    }
  }
  await ctx.reply(text, { ...OPTS, reply_markup: kb });
}
async function showHome(ctx) {
  const uid = ctx.from.id;
  await screen(ctx, `<b>\u041C\u0430\u0440\u043A\u0435\u0442 \u043F\u043B\u0430\u0433\u0438\u043D\u043E\u0432 Inugram</b>
\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435:`, homeKeyboard(uid));
}

// src/admin.ts
var num = (s) => {
  const n = Number(s);
  if (!Number.isSafeInteger(n))
    throw new Stale;
  return n;
};
var nameOf = (ctx) => ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
async function handleAdmin(ctx, action, arg) {
  switch (action) {
    case "home":
      return showAdminHome(ctx);
    case "q":
      return showQueue(ctx, num(arg ?? "0"));
    case "card":
      return showCard(ctx, num(arg));
    case "file": {
      const v2 = await getVersion(num(arg));
      if (!v2)
        throw new Stale;
      await ctx.replyWithDocument(v2.fileId);
      return;
    }
    case "ok": {
      const r = await approve(ctx.api, num(arg), nameOf(ctx));
      if (!r.ok)
        return r.message;
      if (!ctx.callbackQuery?.message || !("document" in ctx.callbackQuery.message))
        return showQueue(ctx, 0);
      return;
    }
    case "no": {
      const v2 = await getVersion(num(arg));
      if (!v2 || v2.status !== "pending")
        return "\u0417\u0430\u044F\u0432\u043A\u0430 \u0443\u0436\u0435 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u0430";
      await setSession(ctx.from.id, "await_reject", { rid: v2.rid });
      if (ctx.chat?.type !== "private")
        return "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0431\u043E\u0442\u0430 \u0432 \u043B\u0438\u0447\u043A\u0435 \u0438 \u043F\u0440\u0438\u0448\u043B\u0438\u0442\u0435 \u043F\u0440\u0438\u0447\u0438\u043D\u0443 \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0438\u044F";
      return screen(ctx, `\u041F\u0440\u0438\u0448\u043B\u0438\u0442\u0435 \u043F\u0440\u0438\u0447\u0438\u043D\u0443 \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0438\u044F \u0434\u043B\u044F <code>${esc(v2.pluginId)} ${esc(v2.version)}</code>.`, new import_grammy5.InlineKeyboard().text("\u041E\u0442\u043C\u0435\u043D\u0430", `a:card:${v2.rid}`));
    }
    case "rq":
      return showRepoQueue(ctx, num(arg ?? "0"));
    case "rcard":
      return showRepoCard(ctx, num(arg));
    case "rok": {
      const r = await approveRepoChange(ctx.api, num(arg), nameOf(ctx));
      if (!r.ok)
        return r.message;
      if (ctx.callbackQuery?.message && "text" in ctx.callbackQuery.message && !ctx.callbackQuery.message.text?.includes("\u0421\u043C\u0435\u043D\u0430 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u044F:")) {
        return showRepoQueue(ctx, 0);
      }
      return;
    }
    case "rno": {
      const c = await getRepoChange(num(arg));
      if (!c || c.status !== "pending")
        return "\u0417\u0430\u044F\u0432\u043A\u0430 \u0443\u0436\u0435 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u0430";
      await setSession(ctx.from.id, "await_reject_repo", { id: c.id });
      if (ctx.chat?.type !== "private")
        return "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0431\u043E\u0442\u0430 \u0432 \u043B\u0438\u0447\u043A\u0435 \u0438 \u043F\u0440\u0438\u0448\u043B\u0438\u0442\u0435 \u043F\u0440\u0438\u0447\u0438\u043D\u0443 \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0438\u044F";
      return screen(ctx, `\u041F\u0440\u0438\u0448\u043B\u0438\u0442\u0435 \u043F\u0440\u0438\u0447\u0438\u043D\u0443 \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0438\u044F \u0441\u043C\u0435\u043D\u044B \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u044F \u0434\u043B\u044F <code>${esc(c.pluginId)}</code>.`, new import_grammy5.InlineKeyboard().text("\u041E\u0442\u043C\u0435\u043D\u0430", `a:rcard:${c.id}`));
    }
    case "all":
      return showAllPlugins(ctx, num(arg ?? "0"));
    case "bans":
      return showBans(ctx, num(arg ?? "0"));
    case "banadd":
      await setSession(ctx.from.id, "await_ban", {});
      return screen(ctx, "\u041F\u0440\u0438\u0448\u043B\u0438\u0442\u0435 Telegram user id, \u043A\u043E\u0442\u043E\u0440\u043E\u0433\u043E \u043D\u0443\u0436\u043D\u043E \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u0442\u044C.", new import_grammy5.InlineKeyboard().text("\u041E\u0442\u043C\u0435\u043D\u0430", "a:bans:0"));
    case "banask":
      return askBan(ctx, num(arg));
    case "banok":
      await setBanned(num(arg), true);
      return showBans(ctx, 0);
    case "unban":
      await setBanned(num(arg), false);
      return showBans(ctx, 0);
    case "svc":
      return showService(ctx);
    case "rebuild":
      return doRebuild(ctx);
    case "backup":
      return doBackup(ctx);
    case "hook":
      return showWebhook(ctx);
  }
  throw new Stale;
}
async function onAdminText(ctx, s, text) {
  if (!isAdmin(ctx.from.id))
    throw new Stale;
  if (s.state === "await_reject") {
    const reason = text.trim().slice(0, 300);
    if (!reason)
      return void await ctx.reply("\u041F\u0440\u0438\u0447\u0438\u043D\u0430 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043F\u0443\u0441\u0442\u043E\u0439.");
    await clearSession(ctx.from.id);
    const r = await reject(ctx.api, s.payload.rid, reason, nameOf(ctx));
    await ctx.reply(r.ok ? "\u274C \u041E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u043E, \u0430\u0432\u0442\u043E\u0440\u0443 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435." : r.message, { reply_markup: nav(new import_grammy5.InlineKeyboard().text("\u041E\u0447\u0435\u0440\u0435\u0434\u044C", "a:q:0").row()) });
    return;
  }
  if (s.state === "await_reject_repo") {
    const reason = text.trim().slice(0, 300);
    if (!reason)
      return void await ctx.reply("\u041F\u0440\u0438\u0447\u0438\u043D\u0430 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043F\u0443\u0441\u0442\u043E\u0439.");
    await clearSession(ctx.from.id);
    const r = await rejectRepoChange(ctx.api, s.payload.id, reason, nameOf(ctx));
    await ctx.reply(r.ok ? "\u274C \u041E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u043E, \u0430\u0432\u0442\u043E\u0440\u0443 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435." : r.message, { reply_markup: nav(new import_grammy5.InlineKeyboard().text("\u0417\u0430\u044F\u0432\u043A\u0438", "a:rq:0").row()) });
    return;
  }
  if (s.state === "await_ban") {
    const id = Number(text.trim());
    if (!Number.isSafeInteger(id) || id <= 0)
      return void await ctx.reply("\u041D\u0443\u0436\u0435\u043D \u0447\u0438\u0441\u043B\u043E\u0432\u043E\u0439 user id.");
    await clearSession(ctx.from.id);
    return askBan(ctx, id);
  }
  throw new Stale;
}
async function showAdminHome(ctx) {
  const [{ total: pending }, { total: plugins }, { total: repos }] = await Promise.all([
    listPendingVersions(0, 1),
    listPlugins({ offset: 0, limit: 1 }),
    listPendingRepoChanges(0, 1)
  ]);
  const kb = new import_grammy5.InlineKeyboard().text(`\uD83D\uDCE5 \u041E\u0447\u0435\u0440\u0435\u0434\u044C \u0437\u0430\u044F\u0432\u043E\u043A (${pending})`, "a:q:0").row().text(`\uD83D\uDD17 \u0421\u043C\u0435\u043D\u0430 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u044F (${repos})`, "a:rq:0").row().text(`\uD83D\uDCDA \u0412\u0441\u0435 \u043F\u043B\u0430\u0433\u0438\u043D\u044B (${plugins})`, "a:all:0").row().text("\uD83D\uDEAB \u0411\u0430\u043D\u044B", "a:bans:0").row().text("\uD83D\uDEE0 \u0421\u0435\u0440\u0432\u0438\u0441", "a:svc").row();
  nav(kb);
  await screen(ctx, "<b>\u041C\u043E\u0434\u0435\u0440\u0430\u0446\u0438\u044F</b>", kb);
}
async function showQueue(ctx, page) {
  const first = await listPendingVersions(0, 1);
  const p2 = clampPage(page, first.total);
  const { rows, total } = await listPendingVersions(p2 * PAGE_SIZE, PAGE_SIZE);
  const kb = new import_grammy5.InlineKeyboard;
  for (const v2 of rows)
    kb.text(`${v2.pluginName} ${v2.version}`, `a:card:${v2.rid}`).row();
  pagerRow(kb, "a:q", p2, total);
  nav(kb, "a:home");
  await screen(ctx, total ? `<b>\u041E\u0447\u0435\u0440\u0435\u0434\u044C \u0437\u0430\u044F\u0432\u043E\u043A</b> (${total})` : `<b>\u041E\u0447\u0435\u0440\u0435\u0434\u044C \u0437\u0430\u044F\u0432\u043E\u043A</b>
\u041F\u0443\u0441\u0442\u043E.`, kb);
}
async function showCard(ctx, rid) {
  const v2 = await getVersion(rid);
  const p2 = v2 && await getPlugin(v2.pluginId);
  if (!v2 || !p2)
    throw new Stale;
  const kb = new import_grammy5.InlineKeyboard().text("\uD83D\uDCCE \u0424\u0430\u0439\u043B", `a:file:${rid}`).row();
  if (v2.status === "pending") {
    const risk = analyzeGrants(v2.grants);
    const reasons = [risk.unknown ? "\u0433\u0440\u0430\u043D\u0442\u044B \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B" : "", risk.unsafe.length ? "unsafe-\u0433\u0440\u0430\u043D\u0442\u044B" : ""].filter(Boolean);
    for (const b2 of modKeyboard(rid).inline_keyboard[0])
      kb.text(b2.text, b2.callback_data);
    kb.row();
    nav(kb, "a:q:0");
    return screen(ctx, modCard(v2, p2, reasons), kb);
  }
  nav(kb, "a:q:0");
  await screen(ctx, `${modCard(v2, p2, [])}

\u0421\u0442\u0430\u0442\u0443\u0441: ${v2.status}`, kb);
}
async function showRepoQueue(ctx, page) {
  const first = await listPendingRepoChanges(0, 1);
  const p2 = clampPage(page, first.total);
  const { rows, total } = await listPendingRepoChanges(p2 * PAGE_SIZE, PAGE_SIZE);
  const kb = new import_grammy5.InlineKeyboard;
  for (const c of rows)
    kb.text(c.pluginName, `a:rcard:${c.id}`).row();
  pagerRow(kb, "a:rq", p2, total);
  nav(kb, "a:home");
  await screen(ctx, total ? `<b>\u0421\u043C\u0435\u043D\u0430 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u044F</b> (${total})` : `<b>\u0421\u043C\u0435\u043D\u0430 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u044F</b>
\u041F\u0443\u0441\u0442\u043E.`, kb);
}
async function showRepoCard(ctx, id) {
  const c = await getRepoChange(id);
  const plugin2 = c && await getPlugin(c.pluginId);
  if (!c || !plugin2)
    throw new Stale;
  const kb = new import_grammy5.InlineKeyboard;
  if (c.status === "pending")
    for (const b2 of repoChangeKeyboard(id).inline_keyboard[0])
      kb.text(b2.text, b2.callback_data);
  kb.row();
  nav(kb, "a:rq:0");
  await screen(ctx, c.status === "pending" ? repoChangeCard(c, plugin2) : `${repoChangeCard(c, plugin2)}

\u0421\u0442\u0430\u0442\u0443\u0441: ${c.status}`, kb);
}
async function showAllPlugins(ctx, page) {
  const first = await listPlugins({ offset: 0, limit: 1 });
  const p2 = clampPage(page, first.total);
  const { rows, total } = await listPlugins({ offset: p2 * PAGE_SIZE, limit: PAGE_SIZE });
  const kb = new import_grammy5.InlineKeyboard;
  for (const pl of rows)
    kb.text(`${pl.hidden ? "\uD83D\uDE48 " : ""}${pl.name}`, `p:open:${pl.rid}`).row();
  pagerRow(kb, "a:all", p2, total);
  nav(kb, "a:home");
  await screen(ctx, `<b>\u0412\u0441\u0435 \u043F\u043B\u0430\u0433\u0438\u043D\u044B</b> (${total})`, kb);
}
async function showBans(ctx, page) {
  const first = await listBanned(0, 1);
  const p2 = clampPage(page, first.total);
  const { rows, total } = await listBanned(p2 * PAGE_SIZE, PAGE_SIZE);
  const kb = new import_grammy5.InlineKeyboard;
  for (const u of rows)
    kb.text(`\u0420\u0430\u0437\u0431\u0430\u043D\u0438\u0442\u044C ${u.name ?? u.id}`, `a:unban:${u.id}`).row();
  pagerRow(kb, "a:bans", p2, total);
  kb.text("\u2795 \u0417\u0430\u0431\u0430\u043D\u0438\u0442\u044C \u043F\u043E id", "a:banadd").row();
  nav(kb, "a:home");
  await screen(ctx, `<b>\u0411\u0430\u043D\u044B</b> (${total})`, kb);
}
async function askBan(ctx, userId) {
  await screen(ctx, `\u0417\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F <code>${userId}</code>? \u041E\u043D \u043D\u0435 \u0441\u043C\u043E\u0436\u0435\u0442 \u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C \u043F\u043B\u0430\u0433\u0438\u043D\u044B.`, new import_grammy5.InlineKeyboard().text("\u0414\u0430, \u0437\u0430\u0431\u0430\u043D\u0438\u0442\u044C", `a:banok:${userId}`).text("\u041D\u0435\u0442", "a:bans:0"));
}
async function showService(ctx) {
  const kb = new import_grammy5.InlineKeyboard().text("\uD83D\uDD04 \u041F\u0435\u0440\u0435\u0441\u043E\u0431\u0440\u0430\u0442\u044C \u043A\u0430\u0442\u0430\u043B\u043E\u0433", "a:rebuild").row().text("\uD83D\uDCBE \u0411\u044D\u043A\u0430\u043F", "a:backup").row().text("\uD83D\uDCE1 \u0421\u0442\u0430\u0442\u0443\u0441 webhook", "a:hook").row();
  nav(kb, "a:home");
  await screen(ctx, "<b>\u0421\u0435\u0440\u0432\u0438\u0441</b>", kb);
}
async function doRebuild(ctx) {
  try {
    const r = await refreshCatalog(ctx.api, { force: true, waitMs: 15000 });
    return r === "queued" ? "\u041F\u0435\u0440\u0435\u0441\u0431\u043E\u0440\u043A\u0430 \u043F\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0430 \u0432 \u043E\u0447\u0435\u0440\u0435\u0434\u044C" : "\u041A\u0430\u0442\u0430\u043B\u043E\u0433 \u043F\u0435\u0440\u0435\u0441\u043E\u0431\u0440\u0430\u043D";
  } catch (e) {
    return `\u041E\u0448\u0438\u0431\u043A\u0430: ${errText(e)}`.slice(0, 190);
  }
}
async function doBackup(ctx) {
  const dump = JSON.stringify(await dumpAll(), null, 1);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  await ctx.replyWithDocument(new import_grammy5.InputFile(new TextEncoder().encode(dump), `backup-${stamp}.json`));
}
async function showWebhook(ctx) {
  const i = await ctx.api.getWebhookInfo();
  const text = [
    "<b>Webhook</b>",
    `url: <code>${esc(i.url || "\u2014")}</code>`,
    `\u0432 \u043E\u0447\u0435\u0440\u0435\u0434\u0438: ${i.pending_update_count}`,
    i.last_error_message ? `\u26A0\uFE0F \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u043E\u0448\u0438\u0431\u043A\u0430: ${esc(i.last_error_message)}` : "\u2705 \u043E\u0448\u0438\u0431\u043E\u043A \u043D\u0435\u0442"
  ].join(`
`);
  await screen(ctx, text, nav(new import_grammy5.InlineKeyboard, "a:svc"));
}

// src/menu.ts
var import_grammy7 = __toESM(require_mod(), 1);

// src/perms.ts
function canManage(userId, ownerId, admin) {
  const owner = userId === ownerId;
  return { allowed: owner || admin, owner };
}

// src/screenshots.ts
var MAX_PHOTO_BYTES = 10 * 1024 * 1024;
var MIN_SIDE = 320;
function checkPhoto(sizes) {
  if (!sizes?.length)
    return { ok: false, error: "\u041F\u0440\u0438\u0448\u043B\u0438\u0442\u0435 \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442 \u043A\u0430\u043A \u0444\u043E\u0442\u043E (\u043D\u0435 \u0444\u0430\u0439\u043B\u043E\u043C \u0438 \u043D\u0435 \u0441\u0442\u0438\u043A\u0435\u0440\u043E\u043C)" };
  const best = sizes.reduce((a2, b2) => b2.width * b2.height > a2.width * a2.height ? b2 : a2);
  if (best.file_size !== undefined && best.file_size > MAX_PHOTO_BYTES)
    return { ok: false, error: "\u0424\u043E\u0442\u043E \u0431\u043E\u043B\u044C\u0448\u0435 10 \u041C\u0411" };
  if (Math.min(best.width, best.height) < MIN_SIDE)
    return { ok: false, error: `\u041C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u0430\u044F \u0441\u0442\u043E\u0440\u043E\u043D\u0430 \u0444\u043E\u0442\u043E \u2014 ${MIN_SIDE} px (\u0443 \u044D\u0442\u043E\u0433\u043E ${Math.min(best.width, best.height)})` };
  return { ok: true, fileId: best.file_id, uniqueId: best.file_unique_id };
}
async function addScreenshot2(api, plugin2, photo) {
  const added = await addScreenshot(plugin2.id, photo.fileId, photo.uniqueId);
  if (!added.ok) {
    return { kind: "error", message: added.reason === "full" ? `\u0423\u0436\u0435 ${MAX_SCREENSHOTS} \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u043E\u0432 \u2014 \u044D\u0442\u043E \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C` : "\u042D\u0442\u043E\u0442 \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442 \u0443\u0436\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D" };
  }
  const live = await hasApproved(plugin2.id);
  if (live) {
    try {
      await publishOneScreenshot(api, plugin2.id, added.shot);
      await refreshCatalog(api);
    } catch (e) {
      await discardScreenshots(api, [added.shot]);
      await removeScreenshot(added.shot.id);
      return { kind: "error", message: `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442: ${e instanceof Error ? e.message : e}` };
    }
  }
  return { kind: "added", count: (await listScreenshots(plugin2.id)).length, published: live };
}
async function deleteScreenshot(api, shot) {
  const removed = await removeScreenshot(shot.id);
  if (!removed)
    return;
  if (removed.msgId !== null) {
    const r = await refreshCatalog(api, { waitMs: 20000 });
    if (r === "queued") {
      await restoreScreenshot(removed);
      throw new PublishError("\u041A\u0430\u0442\u0430\u043B\u043E\u0433 \u0441\u0435\u0439\u0447\u0430\u0441 \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u0435\u0442\u0441\u044F, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 \u043C\u0438\u043D\u0443\u0442\u0443");
    }
    await deleteChannelMessage(api, removed.msgId);
  }
}
async function moveScreenshot2(api, plugin2, id, dir) {
  if (await moveScreenshot(plugin2.id, id, dir))
    await refreshCatalog(api);
}

// src/wizard.ts
var import_grammy6 = __toESM(require_mod(), 1);
import { createHash } from "crypto";

// src/validate.ts
var ok = (value) => ({ ok: true, value });
var fail = (error) => ({ ok: false, error });
var ID_RE = /^[a-z0-9._-]{3,64}$/;
var ICON_RE = /^(inu:\/\/[A-Za-z0-9_]+|tg:\/\/(emoji|addstickers)\?[^\s]+)$/;
function validateId(raw) {
  const v2 = raw.trim();
  return ID_RE.test(v2) ? ok(v2) : fail("id: 3\u201364 \u0441\u0438\u043C\u0432\u043E\u043B\u0430 \u0438\u0437 [a-z0-9._-]");
}
function validateName(raw) {
  const v2 = raw.trim();
  if (!v2)
    return fail("\u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043F\u0443\u0441\u0442\u044B\u043C");
  return [...v2].length <= 40 ? ok(v2) : fail("\u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435: \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 40 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
}
function validateVersion(raw) {
  const v2 = raw.trim();
  return parseSemver(v2) ? ok(v2) : fail("\u0432\u0435\u0440\u0441\u0438\u044F \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 semver, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 1.2.0");
}
function validateIcon(raw) {
  const v2 = raw.trim();
  if (v2.length > 200)
    return fail("\u0438\u043A\u043E\u043D\u043A\u0430 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u0430\u044F");
  return ICON_RE.test(v2) ? ok(v2) : fail("\u0438\u043A\u043E\u043D\u043A\u0430: inu://\u0438\u043C\u044F, tg://emoji?id=\u2026 \u0438\u043B\u0438 tg://addstickers?set=\u2026");
}
function validateChangelog(raw) {
  const v2 = raw.trim();
  return [...v2].length <= 300 ? ok(v2) : fail("changelog: \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 300 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
}
function validateAuthor(raw) {
  const v2 = raw.trim();
  if (!v2)
    return fail("\u0438\u043C\u044F \u0430\u0432\u0442\u043E\u0440\u0430 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043F\u0443\u0441\u0442\u044B\u043C");
  return [...v2].length <= 40 ? ok(v2) : fail("\u0438\u043C\u044F \u0430\u0432\u0442\u043E\u0440\u0430: \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 40 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
}
function validateDescription(raw) {
  const text = raw.trim();
  const map = {};
  let current = null;
  let localized = false;
  let stray = false;
  for (const line of text.split(/\r?\n/)) {
    const m = /^([a-z]{2}):\s?(.*)$/.exec(line);
    if (m) {
      if (stray)
        return fail("\u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435: \u043B\u0438\u0431\u043E \u043E\u0431\u044B\u0447\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442, \u043B\u0438\u0431\u043E \u0441\u0442\u0440\u043E\u043A\u0438 \u0432\u0438\u0434\u0430 \xABru: \u2026\xBB \u0438 \xABen: \u2026\xBB");
      current = m[1];
      localized = true;
      map[current] = m[2];
    } else if (current) {
      map[current] += `
` + line;
    } else if (!current && line.trim()) {
      stray = true;
    }
  }
  if (!localized)
    return [...text].length <= 500 ? ok(text) : fail("\u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435: \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 500 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
  for (const k of Object.keys(map)) {
    map[k] = map[k].trim();
    if (!map[k])
      delete map[k];
    else if ([...map[k]].length > 500)
      return fail(`\u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 (${k}): \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 500 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432`);
  }
  return Object.keys(map).length ? ok(map) : ok("");
}
function descriptionToText(d) {
  if (typeof d === "string")
    return d;
  return Object.entries(d).map(([k, v2]) => `${k}: ${v2}`).join(`
`);
}
function pickDescription(d) {
  if (typeof d === "string")
    return d;
  return d.ru ?? d.en ?? Object.values(d)[0] ?? "";
}

// src/wizard.ts
var NEW_STEPS = ["id", "name", "version", "description", "repo", "icon", "screenshots", "changelog"];
var EXISTING_STEPS = ["id", "version", "changelog"];
var LEGACY_STEPS = ["id", "repo", "version", "changelog"];
var CONFIRM = "\x01";
var LABEL = {
  id: "id \u043F\u043B\u0430\u0433\u0438\u043D\u0430",
  name: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435",
  version: "\u0412\u0435\u0440\u0441\u0438\u044F",
  description: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435",
  repo: "\u0420\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439",
  icon: "\u0418\u043A\u043E\u043D\u043A\u0430",
  screenshots: "\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u044B",
  changelog: "Changelog"
};
var HINT = {
  id: "\u0423\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0439 id \u0432 \u043C\u0430\u0440\u043A\u0435\u0442\u0435: 3\u201364 \u0441\u0438\u043C\u0432\u043E\u043B\u0430 [a-z0-9._-]. \u041B\u0443\u0447\u0448\u0435 \u0442\u0430\u043A\u043E\u0439 \u0436\u0435, \u043A\u0430\u043A @id \u0432 \u0444\u0430\u0439\u043B\u0435.",
  name: "\u0414\u043E 40 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.",
  version: "semver, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 1.2.0. \u0414\u043B\u044F \u043D\u043E\u0432\u043E\u0433\u043E \u0432\u044B\u043F\u0443\u0441\u043A\u0430 \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u0433\u043E \u0431\u043E\u043B\u044C\u0448\u0435 \u0442\u0435\u043A\u0443\u0449\u0435\u0439.",
  description: "\u0414\u043E 500 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432. \u041C\u043E\u0436\u043D\u043E \u043F\u043E \u044F\u0437\u044B\u043A\u0430\u043C: \u0441\u0442\u0440\u043E\u043A\u0438 \xABru: \u2026\xBB \u0438 \xABen: \u2026\xBB. \u041F\u0443\u0441\u0442\u043E\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E.",
  repo: "\u0421\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u044B\u0439 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 \u0441 \u0438\u0441\u0445\u043E\u0434\u043D\u0438\u043A\u0430\u043C\u0438: https://github.com/\u0430\u0432\u0442\u043E\u0440/\u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 (GitHub, GitLab, Codeberg, Bitbucket, SourceHut, Gitea). \u041E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E.",
  icon: "inu://\u0438\u043C\u044F, tg://emoji?id=\u2026 \u0438\u043B\u0438 tg://addstickers?set=\u2026",
  screenshots: "\u041F\u0440\u0438\u0448\u043B\u0438\u0442\u0435 \u043E\u0442 1 \u0434\u043E 8 \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u043E\u0432 \u043A\u0430\u043A \u0444\u043E\u0442\u043E (\u043D\u0435 \u0444\u0430\u0439\u043B\u043E\u043C): \u0434\u043E 10 \u041C\u0411, \u043C\u0435\u043D\u044C\u0448\u0430\u044F \u0441\u0442\u043E\u0440\u043E\u043D\u0430 \u043D\u0435 \u043C\u0435\u043D\u0435\u0435 320 px. \u0428\u0430\u0433 \u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0439; \u043F\u043E\u0437\u0436\u0435 \u0438\u0445 \u043C\u043E\u0436\u043D\u043E \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0432 \u044D\u043A\u0440\u0430\u043D\u0435 \u043F\u043B\u0430\u0433\u0438\u043D\u0430.",
  changelog: "\u0414\u043E 300 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432, \u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E."
};
var OPTIONAL = ["description", "screenshots", "changelog"];
async function startPublish(ctx, pluginRid) {
  const uid = ctx.from.id;
  let title = "<b>\u041F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u044F \u043F\u043B\u0430\u0433\u0438\u043D\u0430</b>";
  if (pluginRid !== undefined) {
    const p2 = await getPluginByRid(pluginRid);
    if (!p2 || p2.owner !== uid)
      throw new Stale;
    title = `<b>\u041D\u043E\u0432\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F:</b> ${esc(p2.name)}`;
  }
  await setSession(uid, "await_file", { pluginRid });
  await screen(ctx, `${title}

\u041F\u0440\u0438\u0448\u043B\u0438\u0442\u0435 \u0444\u0430\u0439\u043B <code>*.inu.js</code> \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u043C (UTF-8, \u0434\u043E 5 \u041C\u0411).`, new import_grammy6.InlineKeyboard().text("\u041E\u0442\u043C\u0435\u043D\u0430", "w:cancel"));
}
async function cancelWizard(ctx) {
  await clearSession(ctx.from.id);
  await showHome(ctx);
}
async function onDocument(ctx) {
  const uid = ctx.from.id;
  const doc = ctx.message.document;
  const session = await getSession(uid);
  const pluginRid = session?.state === "await_file" ? session.payload.pluginRid : undefined;
  const reject2 = (msg) => ctx.reply(`\u274C ${msg}`, { reply_markup: nav(new import_grammy6.InlineKeyboard) });
  if (doc.mime_type?.startsWith("image/")) {
    const inShots = session?.state === "shots" || session?.state === "wiz" && session.payload.steps[session.payload.i] === "screenshots";
    if (inShots)
      return void await reject2("\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u044B \u043D\u0443\u0436\u043D\u043E \u043F\u0440\u0438\u0441\u044B\u043B\u0430\u0442\u044C \u043A\u0430\u043A \u0444\u043E\u0442\u043E (\u0441\u043E \u0441\u0436\u0430\u0442\u0438\u0435\u043C), \u0430 \u043D\u0435 \u0444\u0430\u0439\u043B\u043E\u043C");
  }
  if (!/\.inu\.js$/i.test(doc.file_name ?? ""))
    return void await reject2("\u041D\u0443\u0436\u0435\u043D \u0444\u0430\u0439\u043B \u0441 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435\u043C .inu.js");
  if ((doc.file_size ?? 0) > MAX_FILE_BYTES)
    return void await reject2("\u0424\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 5 \u041C\u0411");
  let buf;
  try {
    const f = await ctx.api.getFile(doc.file_id);
    const res = await fetch(`https://api.telegram.org/file/bot${config().botToken}/${f.file_path}`);
    if (!res.ok)
      throw new Error(`HTTP ${res.status}`);
    buf = new Uint8Array(await res.arrayBuffer());
  } catch {
    return void await reject2("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043A\u0430\u0447\u0430\u0442\u044C \u0444\u0430\u0439\u043B, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437");
  }
  if (buf.byteLength > MAX_FILE_BYTES)
    return void await reject2("\u0424\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 5 \u041C\u0411");
  const text = decodeText(buf);
  if (!text.ok)
    return void await reject2(text.error);
  const sha = createHash("sha256").update(buf).digest("hex");
  const dup = await findBySha(sha);
  if (dup)
    return void await reject2(`\u042D\u0442\u043E\u0442 \u0444\u0430\u0439\u043B \u0443\u0436\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D: ${dup.pluginName} ${dup.version}`);
  const header = parseHeader(text.text);
  const profile = ctx.from.username ?? ctx.from.first_name;
  const w = {
    file: { id: doc.file_id, sha, size: buf.byteLength, name: doc.file_name },
    header,
    existing: false,
    steps: NEW_STEPS,
    i: 0,
    awaiting: false,
    f: {
      id: header?.id,
      name: header?.name,
      author: header?.author ?? profile,
      version: header?.version,
      description: header?.description,
      icon: header?.icon ?? "inu://bot"
    }
  };
  if (pluginRid !== undefined) {
    const p2 = await getPluginByRid(pluginRid);
    if (!p2 || p2.owner !== uid)
      return void await reject2("\u041F\u043B\u0430\u0433\u0438\u043D \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    await adoptExisting(w, p2);
    w.i = 1;
  }
  await ctx.reply(header ? "\uD83D\uDCC4 \u0424\u0430\u0439\u043B \u043F\u0440\u0438\u043D\u044F\u0442, \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u043D \u2014 \u043F\u043E\u0434\u0441\u0442\u0430\u0432\u0438\u043B \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0438\u0437 \u043D\u0435\u0433\u043E." : "\uD83D\uDCC4 \u0424\u0430\u0439\u043B \u043F\u0440\u0438\u043D\u044F\u0442. \u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A <code>==InuPlugin==</code> \u043D\u0435 \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u043D \u2014 \u0437\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043F\u043E\u043B\u044F \u0432\u0440\u0443\u0447\u043D\u0443\u044E; \u0437\u0430\u044F\u0432\u043A\u0430 \u043F\u043E\u0439\u0434\u0451\u0442 \u043D\u0430 \u0440\u0443\u0447\u043D\u0443\u044E \u043C\u043E\u0434\u0435\u0440\u0430\u0446\u0438\u044E.", { parse_mode: "HTML" });
  await renderStep(ctx, w);
}
async function adoptExisting(w, p2) {
  w.existing = true;
  w.steps = p2.repoUrl ? EXISTING_STEPS : LEGACY_STEPS;
  w.f.repo = p2.repoUrl ?? undefined;
  w.f.id = p2.id;
  w.f.name = p2.name;
  w.f.author = p2.author;
  const top = maxSemver(await liveVersionStrings(p2.id));
  const hv = w.header?.version;
  w.f.version = hv && validateVersion(hv).ok && (!top || compareSemver(hv, top) > 0) ? hv : undefined;
}
async function save(ctx, w) {
  await saveWizard(ctx.from.id, w);
}
async function renderStep(ctx, w, notice) {
  const step = w.steps[w.i];
  if (!step)
    return renderCard(ctx, w);
  if (step === "screenshots")
    return renderShots(ctx, w, notice);
  const value = w.f[step];
  const optional = OPTIONAL.includes(step);
  const prompt = !value && !optional ? true : w.awaiting;
  if (prompt && !w.awaiting)
    w.awaiting = true;
  const head = `<b>\u0428\u0430\u0433 ${w.i + 1}/${w.steps.length}: ${LABEL[step]}</b>`;
  let text = `${notice ? `\u26A0\uFE0F ${esc(notice)}

` : ""}${head}
${HINT[step]}`;
  if (step === "version" && w.existing) {
    const top = maxSemver(await liveVersionStrings(w.f.id));
    if (top)
      text += `
\u0422\u0435\u043A\u0443\u0449\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F: <code>${esc(top)}</code>`;
  }
  if (value)
    text += `

\u0422\u0435\u043A\u0443\u0449\u0435\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435:
<code>${esc(value)}</code>`;
  const kb = new import_grammy6.InlineKeyboard;
  if (w.awaiting) {
    text += `

\u270D\uFE0F \u041F\u0440\u0438\u0448\u043B\u0438\u0442\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435\u043C.`;
    if (optional && !value)
      kb.text("\u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C", "w:skip");
  } else if (step === "changelog") {
    kb.text("\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C changelog", "w:edit").text("\u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C", "w:skip");
  } else {
    kb.text("\u041E\u0441\u0442\u0430\u0432\u0438\u0442\u044C", "w:keep").text("\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C", "w:edit");
  }
  kb.row().text("\u041E\u0442\u043C\u0435\u043D\u0430", "w:cancel");
  await save(ctx, w);
  await screen(ctx, text, kb);
}
async function renderShots(ctx, w, notice) {
  const n = w.shots?.length ?? 0;
  const text = `${notice ? `\u26A0\uFE0F ${esc(notice)}

` : ""}<b>\u0428\u0430\u0433 ${w.i + 1}/${w.steps.length}: ${LABEL.screenshots}</b>
${HINT.screenshots}

\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E: ${n}/${MAX_SCREENSHOTS}`;
  const kb = new import_grammy6.InlineKeyboard;
  if (n)
    kb.text("\u0413\u043E\u0442\u043E\u0432\u043E", "w:shotsdone");
  else
    kb.text("\u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C", "w:skip");
  kb.row().text("\u041E\u0442\u043C\u0435\u043D\u0430", "w:cancel");
  w.awaiting = false;
  await save(ctx, w);
  await screen(ctx, text, kb);
}
async function wizPhoto(ctx, w) {
  if (w.steps[w.i] !== "screenshots") {
    await ctx.reply("\u0421\u0435\u0439\u0447\u0430\u0441 \u0444\u043E\u0442\u043E \u043D\u0435 \u043D\u0443\u0436\u043D\u044B. \u0421\u043B\u0435\u0434\u0443\u0439\u0442\u0435 \u0448\u0430\u0433\u0430\u043C \u043C\u0430\u0441\u0442\u0435\u0440\u0430 \u0438\u043B\u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041E\u0442\u043C\u0435\u043D\u0430\xBB.");
    return;
  }
  const check = checkPhoto(ctx.message.photo);
  if (!check.ok)
    return void await ctx.reply(`\u274C ${check.error}`);
  const r = await appendWizardShot(ctx.from.id, { id: check.fileId, u: check.uniqueId });
  if (!r.ok) {
    const why = { full: `\u0423\u0436\u0435 ${MAX_SCREENSHOTS} \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u043E\u0432 \u2014 \u044D\u0442\u043E \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C`, duplicate: "\u042D\u0442\u043E\u0442 \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442 \u0443\u0436\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D", gone: "\u041C\u0430\u0441\u0442\u0435\u0440 \u0437\u0430\u043A\u0440\u044B\u0442, \u043D\u0430\u0447\u043D\u0438\u0442\u0435 \u0437\u0430\u043D\u043E\u0432\u043E" }[r.reason];
    return void await ctx.reply(`\u26A0\uFE0F ${why}`);
  }
  w.shots = r.shots;
  await renderStep(ctx, w);
}
async function applyStep(ctx, w, step, raw) {
  const uid = ctx.from.id;
  switch (step) {
    case "id": {
      const v2 = validateId(raw);
      if (!v2.ok)
        return v2.error;
      const problem = await checkTarget(uid, v2.value, null);
      if (problem)
        return problem;
      w.f.id = v2.value;
      const own = await getPlugin(v2.value);
      if (own && !w.existing) {
        await adoptExisting(w, own);
        return null;
      }
      return null;
    }
    case "name": {
      const v2 = validateName(raw);
      if (!v2.ok)
        return v2.error;
      w.f.name = v2.value;
      return null;
    }
    case "version": {
      const v2 = validateVersion(raw);
      if (!v2.ok)
        return v2.error;
      const problem = await checkTarget(uid, w.f.id, v2.value);
      if (problem)
        return problem;
      w.f.version = v2.value;
      return null;
    }
    case "description": {
      const v2 = validateDescription(raw);
      if (!v2.ok)
        return v2.error;
      w.f.description = raw.trim();
      return null;
    }
    case "repo": {
      const v2 = normalizeRepo(raw);
      if (!v2.ok)
        return v2.error;
      if (w.repoAck === v2.value) {
        w.repoWarning = "\u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D (404), \u0430\u0432\u0442\u043E\u0440 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043B \u0441\u0441\u044B\u043B\u043A\u0443";
      } else {
        const status = await checkRepo(v2.value);
        if (status.status === "not_found") {
          w.f.repo = v2.value;
          w.repoAck = v2.value;
          return CONFIRM + "\u0420\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D (404). \u0422\u043E\u0447\u043D\u043E \u044D\u0442\u0430 \u0441\u0441\u044B\u043B\u043A\u0430?";
        }
        w.repoWarning = repoWarningText(status);
      }
      w.f.repo = v2.value;
      return null;
    }
    case "screenshots":
      return null;
    case "icon": {
      const v2 = validateIcon(raw);
      if (!v2.ok)
        return v2.error;
      w.f.icon = v2.value;
      return null;
    }
    case "changelog": {
      const v2 = validateChangelog(raw);
      if (!v2.ok)
        return v2.error;
      w.f.changelog = v2.value;
      return null;
    }
  }
}
async function load(ctx) {
  const s = await getSession(ctx.from.id);
  if (!s || s.state !== "wiz")
    throw new Stale;
  return s.payload;
}
async function wizAction(ctx, action) {
  const w = await load(ctx);
  const step = w.steps[w.i];
  switch (action) {
    case "keep": {
      if (!step)
        throw new Stale;
      const err = await applyStep(ctx, w, step, w.f[step] ?? "");
      if (err)
        return stepError(ctx, w, err);
      w.i++;
      w.awaiting = false;
      return renderStep(ctx, w);
    }
    case "edit": {
      w.awaiting = true;
      return renderStep(ctx, w);
    }
    case "skip": {
      if (!step || !OPTIONAL.includes(step))
        throw new Stale;
      w.f[step] = "";
      w.i++;
      w.awaiting = false;
      return renderStep(ctx, w);
    }
    case "shotsdone":
      if (step !== "screenshots")
        throw new Stale;
      w.i++;
      return renderStep(ctx, w);
    case "go":
      return publish(ctx, w);
    default:
      throw new Stale;
  }
}
async function stepError(ctx, w, err) {
  const confirm = err.startsWith(CONFIRM);
  w.awaiting = !confirm;
  return renderStep(ctx, w, confirm ? err.slice(CONFIRM.length) : err);
}
async function wizText(ctx, payload, text) {
  const w = payload;
  const step = w.steps[w.i];
  if (!step || !w.awaiting) {
    await ctx.reply("\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0438 \u043F\u043E\u0434 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435\u043C \u043C\u0430\u0441\u0442\u0435\u0440\u0430 \u0438\u043B\u0438 /cancel.");
    return;
  }
  const err = await applyStep(ctx, w, step, text);
  if (err)
    return stepError(ctx, w, err);
  w.i++;
  w.awaiting = false;
  return renderStep(ctx, w);
}
function compose(w) {
  const description = validateDescription(w.f.description ?? "");
  return {
    id: w.f.id,
    name: w.f.name,
    author: w.f.author,
    version: w.f.version,
    description: description.ok ? description.value : "",
    icon: w.f.icon,
    repo: w.f.repo,
    changelog: w.f.changelog ?? ""
  };
}
async function existingRepo(id) {
  return (await getPlugin(id))?.repoUrl ?? null;
}
async function renderCard(ctx, w) {
  const f = compose(w);
  const grants = w.header ? w.header.grants : null;
  const risk = analyzeGrants(grants);
  const warnings = [];
  if (w.header?.id && w.header.id !== f.id)
    warnings.push(`@id \u0432 \u0444\u0430\u0439\u043B\u0435 (\xAB${w.header.id}\xBB) \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 id \u0432 \u043C\u0430\u0440\u043A\u0435\u0442\u0435: \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043F\u043E\u0441\u0442\u0430\u0432\u0438\u0442 \u044D\u0442\u043E \u043A\u0430\u043A \u0434\u0440\u0443\u0433\u043E\u0439 \u043F\u043B\u0430\u0433\u0438\u043D, \u0430 \u043D\u0435 \u043E\u0431\u043D\u043E\u0432\u0438\u0442 \u0441\u0442\u0430\u0440\u044B\u0439.`);
  if (w.header?.version && w.header.version !== f.version)
    warnings.push(`\u0432\u0435\u0440\u0441\u0438\u044F \u0432 \u0444\u0430\u0439\u043B\u0435 (\xAB${w.header.version}\xBB) \u043E\u0442\u043B\u0438\u0447\u0430\u0435\u0442\u0441\u044F \u043E\u0442 \u0432\u0432\u0435\u0434\u0451\u043D\u043D\u043E\u0439.`);
  if (w.repoWarning && w.f.repo && w.f.repo !== await existingRepo(f.id))
    warnings.push(w.repoWarning);
  const decision = needsModeration({
    grants,
    hasApproved: await hasApproved(f.id),
    previousGrants: await approvedGrants(f.id)
  });
  const lines = [
    "<b>\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u044E</b>",
    `${w.existing ? "\u041D\u043E\u0432\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F \u043F\u043B\u0430\u0433\u0438\u043D\u0430" : "\u041D\u043E\u0432\u044B\u0439 \u043F\u043B\u0430\u0433\u0438\u043D"}: <b>${esc(f.name)}</b> <code>${esc(f.version)}</code>`,
    `id: <code>${esc(f.id)}</code>`,
    `\u0430\u0432\u0442\u043E\u0440: ${esc(f.author)}`,
    `\u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439: ${esc(f.repo)}`,
    w.shots?.length ? `\u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u044B: ${w.shots.length}` : "",
    `\u0438\u043A\u043E\u043D\u043A\u0430: <code>${esc(f.icon)}</code>`,
    w.f.description ? `\u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435: ${esc(w.f.description)}` : "",
    f.changelog ? `changelog: ${esc(f.changelog)}` : "",
    grantsBlock(grants, risk),
    ...warnings.map((x2) => `\u26A0\uFE0F ${esc(x2)}`),
    decision.required ? `
\uD83D\uDEE1 \u0417\u0430\u044F\u0432\u043A\u0430 \u0443\u0439\u0434\u0451\u0442 \u043D\u0430 \u043C\u043E\u0434\u0435\u0440\u0430\u0446\u0438\u044E (${esc(decision.reasons.join("; "))}).` : `
\u0412\u0435\u0440\u0441\u0438\u044F \u0431\u0443\u0434\u0435\u0442 \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u0430 \u0441\u0440\u0430\u0437\u0443.`
  ];
  w.awaiting = false;
  await save(ctx, w);
  await screen(ctx, lines.filter(Boolean).join(`
`), new import_grammy6.InlineKeyboard().text("\u2705 \u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C", "w:go").text("\u041E\u0442\u043C\u0435\u043D\u0430", "w:cancel"));
}
async function publish(ctx, w) {
  const uid = ctx.from.id;
  if (!await clearSession(uid))
    throw new Stale;
  await screen(ctx, "\u23F3 \u041F\u0443\u0431\u043B\u0438\u043A\u0443\u044E\u2026");
  const f = compose(w);
  const result = await submit(ctx.api, { userId: uid, file: { id: w.file.id, sha: w.file.sha }, header: w.header, fields: f, repoWarning: w.repoWarning ?? null, screenshots: w.shots ?? [] });
  const kb = new import_grammy6.InlineKeyboard().text("\uD83D\uDCE6 \u041C\u043E\u0438 \u043F\u043B\u0430\u0433\u0438\u043D\u044B", "p:list:0").row().text("\u2302 \u041C\u0435\u043D\u044E", "m:home");
  if (result.kind === "published") {
    await screen(ctx, `\u2705 <b>${esc(f.name)}</b> ${esc(f.version)} \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D \u0432 @${config().channelUsername}.${result.queued ? `
\u041A\u0430\u0442\u0430\u043B\u043E\u0433 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u0441\u044F \u0432 \u0442\u0435\u0447\u0435\u043D\u0438\u0435 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u0438\u0445 \u043C\u0438\u043D\u0443\u0442.` : ""}`, kb);
  } else if (result.kind === "pending") {
    await screen(ctx, `\u23F3 <b>${esc(f.name)}</b> ${esc(f.version)} \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u043D\u0430 \u043C\u043E\u0434\u0435\u0440\u0430\u0446\u0438\u044E. \u042F \u0441\u043E\u043E\u0431\u0449\u0443 \u043E \u0440\u0435\u0448\u0435\u043D\u0438\u0438.`, kb);
  } else {
    await screen(ctx, `\u274C ${esc(result.message)}`, kb);
  }
}

// src/menu.ts
var num2 = (s) => {
  const n = Number(s);
  if (!Number.isInteger(n))
    throw new Stale;
  return n;
};
async function accessible(ctx, rid) {
  const plugin2 = await getPluginByRid(rid);
  const uid = ctx.from.id;
  if (!plugin2)
    throw new Stale;
  const { allowed, owner } = canManage(uid, plugin2.owner, isAdmin(uid));
  if (!allowed)
    throw new Stale;
  return { plugin: plugin2, owner };
}
async function versionAccess(ctx, vrid) {
  const v2 = await getVersion(vrid);
  if (!v2)
    throw new Stale;
  const plugin2 = await getPlugin(v2.pluginId);
  if (!plugin2)
    throw new Stale;
  const uid = ctx.from.id;
  const { allowed, owner } = canManage(uid, plugin2.owner, isAdmin(uid));
  if (!allowed)
    throw new Stale;
  return { v: v2, plugin: plugin2, owner };
}
async function handleCallback(ctx) {
  const [scr, action, a1, a2] = ctx.callbackQuery.data.split(":");
  const uid = ctx.from.id;
  if (scr === "x")
    return;
  if (scr !== "w" && !(scr === "p" && action === "repoyes"))
    await clearSession(uid);
  switch (scr) {
    case "m":
      if (action === "home")
        return showHome(ctx);
      if (action === "help")
        return showHelp(ctx);
      break;
    case "w":
      if (action === "pub")
        return startPublish(ctx);
      if (action === "cancel")
        return cancelWizard(ctx);
      return wizAction(ctx, action);
    case "p":
      return pluginRoute(ctx, action, a1, a2);
    case "v":
      return versionRoute(ctx, action, num2(a1));
    case "s":
      return shotRoute(ctx, action, num2(a1), a2);
    case "a":
      if (!isAdmin(uid))
        throw new Stale;
      return handleAdmin(ctx, action, a1);
  }
  throw new Stale;
}
async function pluginRoute(ctx, action, a1, a2) {
  switch (action) {
    case "list":
      return showMyPlugins(ctx, num2(a1));
    case "open":
      return showPlugin(ctx, num2(a1));
    case "newv": {
      const { plugin: plugin2, owner } = await accessible(ctx, num2(a1));
      if (!owner)
        throw new Stale;
      return startPublish(ctx, plugin2.rid);
    }
    case "desc":
    case "icon":
    case "auth": {
      const { plugin: plugin2, owner } = await accessible(ctx, num2(a1));
      if (!owner)
        throw new Stale;
      const field = action === "desc" ? "description" : action === "icon" ? "icon" : "author";
      await setSession(ctx.from.id, "edit", { field, rid: plugin2.rid });
      const current = field === "description" ? descriptionToText(plugin2.description) : field === "icon" ? plugin2.icon : plugin2.author;
      const hint = field === "description" ? "\u041F\u0440\u0438\u0448\u043B\u0438\u0442\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 (\u0434\u043E 500 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432) \u0438\u043B\u0438 \u0441\u0442\u0440\u043E\u043A\u0438 \xABru: \u2026\xBB / \xABen: \u2026\xBB." : field === "icon" ? "\u041F\u0440\u0438\u0448\u043B\u0438\u0442\u0435 \u0438\u043A\u043E\u043D\u043A\u0443: inu://\u0438\u043C\u044F, tg://emoji?id=\u2026 \u0438\u043B\u0438 tg://addstickers?set=\u2026" : "\u041F\u0440\u0438\u0448\u043B\u0438\u0442\u0435 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0430\u0435\u043C\u043E\u0435 \u0438\u043C\u044F \u0430\u0432\u0442\u043E\u0440\u0430 (\u0434\u043E 40 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432).";
      return screen(ctx, `<b>${esc(plugin2.name)}</b>
${hint}${current ? `

\u0421\u0435\u0439\u0447\u0430\u0441:
<code>${esc(current)}</code>` : ""}`, new import_grammy7.InlineKeyboard().text("\u041E\u0442\u043C\u0435\u043D\u0430", `p:open:${plugin2.rid}`));
    }
    case "shots":
      return showShots(ctx, num2(a1));
    case "repo":
      return showRepo(ctx, num2(a1));
    case "repoedit": {
      const { plugin: plugin2, owner } = await accessible(ctx, num2(a1));
      if (!owner)
        throw new Stale;
      await setSession(ctx.from.id, "edit", { field: "repo", rid: plugin2.rid });
      const now2 = plugin2.repoUrl ? `

\u0421\u0435\u0439\u0447\u0430\u0441:
${esc(plugin2.repoUrl)}` : "";
      const note = plugin2.repoUrl ? `
\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0435\u043B\u044C\u0437\u044F, \u0442\u043E\u043B\u044C\u043A\u043E \u0437\u0430\u043C\u0435\u043D\u0438\u0442\u044C.` : "";
      return screen(ctx, `<b>${esc(plugin2.name)}</b>
\u041F\u0440\u0438\u0448\u043B\u0438\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u044B\u0439 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439: https://github.com/\u0430\u0432\u0442\u043E\u0440/\u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 (GitHub, GitLab, Codeberg, Bitbucket, SourceHut, Gitea).${note}${now2}`, new import_grammy7.InlineKeyboard().text("\u041E\u0442\u043C\u0435\u043D\u0430", `p:repo:${plugin2.rid}`));
    }
    case "repoyes": {
      const { plugin: plugin2, owner } = await accessible(ctx, num2(a1));
      const s = await getSession(ctx.from.id);
      if (!owner || !s || s.state !== "repo_confirm" || s.payload.rid !== plugin2.rid)
        throw new Stale;
      await clearSession(ctx.from.id);
      return finishRepoChange(ctx, plugin2, s.payload.url, true);
    }
    case "vers":
      return showVersions(ctx, num2(a1), num2(a2 ?? "0"));
    case "del": {
      const { plugin: plugin2 } = await accessible(ctx, num2(a1));
      return screen(ctx, `\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043F\u043B\u0430\u0433\u0438\u043D <b>${esc(plugin2.name)}</b>?
\u0412\u0441\u0435 \u0432\u0435\u0440\u0441\u0438\u0438 \u043F\u0440\u043E\u043F\u0430\u0434\u0443\u0442 \u0438\u0437 \u043A\u0430\u043D\u0430\u043B\u0430 \u0438 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430, \u0441\u0447\u0451\u0442\u0447\u0438\u043A \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043E\u043A \u043E\u0431\u043D\u0443\u043B\u0438\u0442\u0441\u044F.`, new import_grammy7.InlineKeyboard().text("\u0414\u0430, \u0443\u0434\u0430\u043B\u0438\u0442\u044C", `p:delok:${plugin2.rid}`).text("\u041D\u0435\u0442", `p:open:${plugin2.rid}`));
    }
    case "delok": {
      const { plugin: plugin2 } = await accessible(ctx, num2(a1));
      try {
        await removePlugin(ctx.api, plugin2.id);
      } catch (e) {
        if (e instanceof PublishError)
          return e.message;
        throw e;
      }
      return showMyPlugins(ctx, 0);
    }
    case "hide": {
      if (!isAdmin(ctx.from.id))
        throw new Stale;
      const { plugin: plugin2 } = await accessible(ctx, num2(a1));
      await updatePlugin(plugin2.id, { hidden: !plugin2.hidden });
      await refreshAfterEdit(ctx.api);
      return showPlugin(ctx, plugin2.rid);
    }
  }
  throw new Stale;
}
async function versionRoute(ctx, action, vrid) {
  const { v: v2, plugin: plugin2, owner } = await versionAccess(ctx, vrid);
  const mod = isAdmin(ctx.from.id);
  switch (action) {
    case "open":
      return showVersion(ctx, vrid);
    case "hide":
    case "show": {
      try {
        if (action === "hide") {
          if (v2.status !== "approved")
            throw new Stale;
          await unpublishVersion(ctx.api, vrid, "hide");
          if (!owner && mod)
            await setVersionStatus(vrid, "hidden", { rejectReason: "mod" });
        } else {
          if (v2.status !== "hidden")
            throw new Stale;
          if (v2.rejectReason === "mod" && !mod)
            return "\u0412\u0435\u0440\u0441\u0438\u044F \u0441\u043A\u0440\u044B\u0442\u0430 \u043C\u043E\u0434\u0435\u0440\u0430\u0442\u043E\u0440\u043E\u043C";
          await publishVersion(ctx.api, vrid, "hidden");
        }
      } catch (e) {
        if (e instanceof PublishError)
          return e.message;
        throw e;
      }
      return showVersion(ctx, vrid);
    }
    case "del":
      return screen(ctx, `\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u0435\u0440\u0441\u0438\u044E <b>${esc(plugin2.name)} ${esc(v2.version)}</b>? \u0424\u0430\u0439\u043B \u0431\u0443\u0434\u0435\u0442 \u0443\u0434\u0430\u043B\u0451\u043D \u0438\u0437 \u043A\u0430\u043D\u0430\u043B\u0430.`, new import_grammy7.InlineKeyboard().text("\u0414\u0430, \u0443\u0434\u0430\u043B\u0438\u0442\u044C", `v:delok:${vrid}`).text("\u041D\u0435\u0442", `v:open:${vrid}`));
    case "delok": {
      try {
        await unpublishVersion(ctx.api, vrid, "delete");
      } catch (e) {
        if (e instanceof PublishError)
          return e.message;
        throw e;
      }
      return showVersions(ctx, plugin2.rid, 0);
    }
  }
  throw new Stale;
}
async function showHelp(ctx) {
  const text = [
    "<b>\u041A\u0430\u043A \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C \u043F\u043B\u0430\u0433\u0438\u043D</b>",
    "1. \xAB\u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C \u043F\u043B\u0430\u0433\u0438\u043D\xBB \u2192 \u043F\u0440\u0438\u0448\u043B\u0438\u0442\u0435 \u0444\u0430\u0439\u043B <code>*.inu.js</code> (UTF-8, \u0434\u043E 5 \u041C\u0411).",
    "2. \u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 id, \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435, \u0432\u0435\u0440\u0441\u0438\u044E, \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435, \u0438\u043A\u043E\u043D\u043A\u0443 \u0438 changelog. \u0417\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043F\u043E\u0434\u0441\u0442\u0430\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0438\u0437 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430 \u0444\u0430\u0439\u043B\u0430, \u0435\u0441\u043B\u0438 \u043E\u043D \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u043D.",
    "3. \u041D\u043E\u0432\u044B\u0435 \u043F\u043B\u0430\u0433\u0438\u043D\u044B \u0438 \u0432\u0435\u0440\u0441\u0438\u0438 \u0441 \u043D\u043E\u0432\u044B\u043C\u0438 <code>unsafe.*</code> \u0433\u0440\u0430\u043D\u0442\u0430\u043C\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442 \u043C\u043E\u0434\u0435\u0440\u0430\u0442\u043E\u0440.",
    "",
    "<b>\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0444\u0430\u0439\u043B\u0430</b>",
    `<pre>// ==InuPlugin==
// @name    My plugin
// @id      me.myplugin
// @version 1.0.0
// @grant   fetch(example.com)
// ==/InuPlugin==</pre>`,
    "",
    "<b>\u041F\u0440\u0430\u0432\u0438\u043B\u0430</b>",
    "\u2022 \u0412\u0435\u0440\u0441\u0438\u044F \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u0433\u043E \u0431\u043E\u043B\u044C\u0448\u0435 \u043F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0435\u0439 (semver).",
    "\u2022 id \u0437\u0430\u043D\u044F\u0442 \u043F\u0435\u0440\u0432\u044B\u043C \u0430\u0432\u0442\u043E\u0440\u043E\u043C; \u0447\u0443\u0436\u043E\u0439 id \u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C \u043D\u0435\u043B\u044C\u0437\u044F.",
    "\u2022 \u0414\u0435\u0440\u0436\u0438\u0442\u0435 <code>@id</code> \u0432 \u0444\u0430\u0439\u043B\u0435 \u043D\u0435\u0438\u0437\u043C\u0435\u043D\u043D\u044B\u043C \u2014 \u043F\u043E \u043D\u0435\u043C\u0443 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0440\u0435\u0448\u0430\u0435\u0442, \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043F\u043B\u0430\u0433\u0438\u043D \u0438\u043B\u0438 \u043F\u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043D\u043E\u0432\u044B\u0439.",
    "\u2022 \u0413\u0440\u0430\u043D\u0442\u044B \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u0441\u0430\u043C\u043E \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043F\u0440\u0438 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0435; \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435 \u043E\u043D\u0438 \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u044B\u0435."
  ].join(`
`);
  await screen(ctx, text, nav(new import_grammy7.InlineKeyboard().url("\uD83D\uDCE3 \u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043A\u0430\u043D\u0430\u043B", `https://t.me/${config().channelUsername}`).row()));
}
async function showMyPlugins(ctx, page) {
  const uid = ctx.from.id;
  const first = await listPlugins({ owner: uid, offset: 0, limit: 1 });
  const p2 = clampPage(page, first.total);
  const { rows, total } = await listPlugins({ owner: uid, offset: p2 * PAGE_SIZE, limit: PAGE_SIZE });
  const kb = new import_grammy7.InlineKeyboard;
  for (const pl of rows)
    kb.text(`${pl.hidden ? "\uD83D\uDE48 " : ""}${pl.name}`, `p:open:${pl.rid}`).row();
  pagerRow(kb, "p:list", p2, total);
  kb.text("\uD83D\uDCE4 \u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C \u043F\u043B\u0430\u0433\u0438\u043D", "w:pub").row();
  nav(kb);
  await screen(ctx, total ? `<b>\u041C\u043E\u0438 \u043F\u043B\u0430\u0433\u0438\u043D\u044B</b> (${total})` : `<b>\u041C\u043E\u0438 \u043F\u043B\u0430\u0433\u0438\u043D\u044B</b>
\u041F\u043E\u043A\u0430 \u043F\u0443\u0441\u0442\u043E \u2014 \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u0443\u0439\u0442\u0435 \u043F\u0435\u0440\u0432\u044B\u0439.`, kb);
}
async function showPlugin(ctx, rid) {
  const { plugin: plugin2, owner } = await accessible(ctx, rid);
  const [{ rows, total }, installs] = await Promise.all([listVersions(plugin2.id, { offset: 0, limit: 5 }), installCount(plugin2.id)]);
  const desc = pickDescription(plugin2.description);
  const lines = [
    `<b>${esc(plugin2.name)}</b>${plugin2.hidden ? " \uD83D\uDE48 \u0441\u043A\u0440\u044B\u0442" : ""}`,
    `id: <code>${esc(plugin2.id)}</code>`,
    `\u0430\u0432\u0442\u043E\u0440: ${esc(plugin2.author)}${owner ? "" : ` (<code>${plugin2.owner}</code>)`}`,
    `\u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0438: ${installs}`,
    plugin2.repoUrl ? `\u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439: ${esc(plugin2.repoUrl)}` : "\u26A0\uFE0F \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D \u2014 \u043F\u043B\u0430\u0433\u0438\u043D\u0430 \u043D\u0435\u0442 \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435",
    desc ? `
${esc(desc)}` : "",
    "",
    total ? "<b>\u0412\u0435\u0440\u0441\u0438\u0438</b>" : "\u0412\u0435\u0440\u0441\u0438\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442.",
    ...rows.map((v2) => `${STATUS_ICON[v2.status] ?? "\u2022"} <code>${esc(v2.version)}</code> \xB7 ${STATUS_NAME[v2.status] ?? v2.status} \xB7 ${when(v2.date)}`),
    total > rows.length ? `\u2026 \u0438 \u0435\u0449\u0451 ${total - rows.length}` : ""
  ];
  const kb = new import_grammy7.InlineKeyboard;
  if (owner) {
    kb.text("\u041D\u043E\u0432\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F", `p:newv:${rid}`).text("\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435", `p:desc:${rid}`).row();
    kb.text("\u0418\u043A\u043E\u043D\u043A\u0430", `p:icon:${rid}`).text("\u0410\u0432\u0442\u043E\u0440", `p:auth:${rid}`).row();
    kb.text("\uD83D\uDD17 \u0420\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439", `p:repo:${rid}`).text("\uD83D\uDDBC \u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u044B", `p:shots:${rid}`).row();
  }
  if (!owner)
    kb.text("\uD83D\uDDBC \u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u044B", `p:shots:${rid}`).row();
  kb.text("\u0412\u0435\u0440\u0441\u0438\u0438", `p:vers:${rid}:0`).text("\u0423\u0434\u0430\u043B\u0438\u0442\u044C", `p:del:${rid}`).row();
  if (isAdmin(ctx.from.id))
    kb.text(plugin2.hidden ? "\uD83D\uDC41 \u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043F\u043B\u0430\u0433\u0438\u043D" : "\uD83D\uDE48 \u0421\u043A\u0440\u044B\u0442\u044C \u043F\u043B\u0430\u0433\u0438\u043D", `p:hide:${rid}`).row();
  nav(kb, owner ? "p:list:0" : "a:all:0");
  await screen(ctx, lines.join(`
`).replace(/\n{3,}/g, `

`), kb);
}
async function shotRoute(ctx, action, rid, arg) {
  const { plugin: plugin2, owner } = await accessible(ctx, rid);
  const shotOf = async () => {
    const shot = await getScreenshot(num2(arg));
    if (!shot || shot.pluginId !== plugin2.id)
      throw new Stale;
    return shot;
  };
  switch (action) {
    case "add": {
      if (!owner)
        throw new Stale;
      const count = (await listScreenshots(plugin2.id)).length;
      if (count >= MAX_SCREENSHOTS)
        return `\u0423\u0436\u0435 ${MAX_SCREENSHOTS} \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u043E\u0432 \u2014 \u044D\u0442\u043E \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C`;
      await setSession(ctx.from.id, "shots", { rid });
      return screen(ctx, `<b>${esc(plugin2.name)}</b>
\u041F\u0440\u0438\u0448\u043B\u0438\u0442\u0435 \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u044B \u043A\u0430\u043A \u0444\u043E\u0442\u043E (\u043D\u0435 \u0444\u0430\u0439\u043B\u043E\u043C): \u0434\u043E 10 \u041C\u0411, \u043C\u0435\u043D\u044C\u0448\u0430\u044F \u0441\u0442\u043E\u0440\u043E\u043D\u0430 \u043D\u0435 \u043C\u0435\u043D\u0435\u0435 320 px. \u041C\u043E\u0436\u043D\u043E \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0434\u0440\u044F\u0434. \u0421\u0435\u0439\u0447\u0430\u0441 ${count}/${MAX_SCREENSHOTS}.`, new import_grammy7.InlineKeyboard().text("\u0413\u043E\u0442\u043E\u0432\u043E", `p:shots:${rid}`));
    }
    case "view": {
      const list = await listScreenshots(plugin2.id);
      if (!list.length)
        return "\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u043E\u0432 \u043D\u0435\u0442";
      if (list.length === 1)
        await ctx.replyWithPhoto(list[0].fileId);
      else
        await ctx.replyWithMediaGroup(list.map((s) => ({ type: "photo", media: s.fileId })));
      return;
    }
    case "left":
    case "right": {
      if (!owner)
        throw new Stale;
      const shot = await shotOf();
      await moveScreenshot2(ctx.api, plugin2, shot.id, action === "left" ? -1 : 1);
      return showShots(ctx, rid);
    }
    case "del": {
      const shot = await shotOf();
      return screen(ctx, `\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442 \u2116${shot.position + 1} \u043F\u043B\u0430\u0433\u0438\u043D\u0430 <b>${esc(plugin2.name)}</b>? \u0424\u043E\u0442\u043E \u0431\u0443\u0434\u0435\u0442 \u0443\u0434\u0430\u043B\u0435\u043D\u043E \u0438\u0437 \u043A\u0430\u043D\u0430\u043B\u0430.`, new import_grammy7.InlineKeyboard().text("\u0414\u0430, \u0443\u0434\u0430\u043B\u0438\u0442\u044C", `s:delok:${rid}:${shot.id}`).text("\u041D\u0435\u0442", `p:shots:${rid}`));
    }
    case "delok": {
      const shot = await shotOf();
      try {
        await deleteScreenshot(ctx.api, shot);
      } catch (e) {
        if (e instanceof PublishError)
          return e.message;
        throw e;
      }
      return showShots(ctx, rid);
    }
  }
  throw new Stale;
}
async function showShots(ctx, rid) {
  const { plugin: plugin2, owner } = await accessible(ctx, rid);
  const list = await listScreenshots(plugin2.id);
  const lines = [
    `<b>${esc(plugin2.name)}</b> \u2014 \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u044B (${list.length}/${MAX_SCREENSHOTS})`,
    list.length ? list.map((s, i) => `${i + 1}. ${s.msgId !== null ? "\u2705 \u0432 \u043A\u0430\u043D\u0430\u043B\u0435" : "\u23F3 \u0436\u0434\u0451\u0442 \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u0438\u044F \u043F\u043B\u0430\u0433\u0438\u043D\u0430"}`).join(`
`) : "\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442."
  ];
  const kb = new import_grammy7.InlineKeyboard;
  list.forEach((s, i) => {
    kb.text(`#${i + 1}`, "x:noop");
    if (owner && i > 0)
      kb.text("\u25C0", `s:left:${rid}:${s.id}`);
    if (owner && i < list.length - 1)
      kb.text("\u25B6", `s:right:${rid}:${s.id}`);
    kb.text("\uD83D\uDDD1", `s:del:${rid}:${s.id}`).row();
  });
  if (owner && list.length < MAX_SCREENSHOTS)
    kb.text("\u2795 \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C", `s:add:${rid}`);
  if (list.length)
    kb.text("\uD83D\uDC41 \u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C", `s:view:${rid}`);
  kb.row();
  nav(kb, `p:open:${rid}`);
  await screen(ctx, lines.join(`
`), kb);
}
async function showRepo(ctx, rid) {
  const { plugin: plugin2, owner } = await accessible(ctx, rid);
  const pending = await pendingRepoChange(plugin2.id);
  const lines = [
    `<b>${esc(plugin2.name)}</b> \u2014 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439`,
    plugin2.repoUrl ? esc(plugin2.repoUrl) : "\u26A0\uFE0F \u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D. \u0411\u0435\u0437 \u043D\u0435\u0433\u043E \u043F\u043B\u0430\u0433\u0438\u043D\u0430 \u043D\u0435\u0442 \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435.",
    plugin2.repoWarning ? `\u26A0\uFE0F ${esc(plugin2.repoWarning)}` : "",
    pending ? `
\u23F3 \u041D\u0430 \u043C\u043E\u0434\u0435\u0440\u0430\u0446\u0438\u0438: ${esc(pending.repoUrl)}` : ""
  ];
  const kb = new import_grammy7.InlineKeyboard;
  if (owner && !pending)
    kb.text(plugin2.repoUrl ? "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C" : "\u0423\u043A\u0430\u0437\u0430\u0442\u044C", `p:repoedit:${rid}`).row();
  nav(kb, `p:open:${rid}`);
  await screen(ctx, lines.filter(Boolean).join(`
`), kb);
}
async function finishRepoChange(ctx, plugin2, url, confirmed) {
  const r = await requestRepoChange(ctx.api, plugin2, url, ctx.from.id, { confirmed });
  if (r.kind === "error") {
    await setSession(ctx.from.id, "edit", { field: "repo", rid: plugin2.rid });
    await ctx.reply(`\u26A0\uFE0F ${r.message}
\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437 \u0438\u043B\u0438 \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043C\u0435\u043D\u044E.`);
    return;
  }
  if (r.kind === "confirm") {
    await setSession(ctx.from.id, "repo_confirm", { rid: plugin2.rid, url: r.url });
    await screen(ctx, `\u26A0\uFE0F ${esc(r.message)}
${esc(r.url)}`, new import_grammy7.InlineKeyboard().text("\u041E\u0441\u0442\u0430\u0432\u0438\u0442\u044C", `p:repoyes:${plugin2.rid}`).text("\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C", `p:repoedit:${plugin2.rid}`));
    return;
  }
  if (r.kind === "pending")
    await ctx.reply("\u23F3 \u041D\u043E\u0432\u044B\u0439 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u043D\u0430 \u043C\u043E\u0434\u0435\u0440\u0430\u0446\u0438\u044E. \u0414\u043E \u0440\u0435\u0448\u0435\u043D\u0438\u044F \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435 \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u043F\u0440\u0435\u0436\u043D\u044F\u044F \u0441\u0441\u044B\u043B\u043A\u0430.");
  await showRepo(ctx, plugin2.rid);
}
async function showVersions(ctx, rid, page) {
  const { plugin: plugin2 } = await accessible(ctx, rid);
  const first = await listVersions(plugin2.id, { offset: 0, limit: 1 });
  const p2 = clampPage(page, first.total);
  const { rows, total } = await listVersions(plugin2.id, { offset: p2 * PAGE_SIZE, limit: PAGE_SIZE });
  const kb = new import_grammy7.InlineKeyboard;
  for (const v2 of rows)
    kb.text(`${STATUS_ICON[v2.status] ?? "\u2022"} ${v2.version}`, `v:open:${v2.rid}`).row();
  pagerRow(kb, `p:vers:${rid}`, p2, total);
  nav(kb, `p:open:${rid}`);
  await screen(ctx, `<b>${esc(plugin2.name)}</b> \u2014 \u0432\u0435\u0440\u0441\u0438\u0438 (${total})`, kb);
}
async function showVersion(ctx, vrid) {
  const { v: v2, plugin: plugin2 } = await versionAccess(ctx, vrid);
  const lines = [
    `<b>${esc(plugin2.name)}</b> <code>${esc(v2.version)}</code>`,
    `${STATUS_ICON[v2.status] ?? ""} ${STATUS_NAME[v2.status] ?? v2.status} \xB7 ${when(v2.date)}`,
    v2.rejectReason && v2.status === "rejected" ? `\u041F\u0440\u0438\u0447\u0438\u043D\u0430: ${esc(v2.rejectReason)}` : "",
    v2.changelog ? `Changelog: ${esc(v2.changelog)}` : "",
    grantsBlock(v2.grants, analyzeGrants(v2.grants))
  ];
  const kb = new import_grammy7.InlineKeyboard;
  if (v2.status === "approved")
    kb.text("\uD83D\uDE48 \u0421\u043A\u0440\u044B\u0442\u044C", `v:hide:${vrid}`);
  if (v2.status === "hidden")
    kb.text("\uD83D\uDC41 \u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C", `v:show:${vrid}`);
  kb.text("\u0423\u0434\u0430\u043B\u0438\u0442\u044C", `v:del:${vrid}`).row();
  nav(kb, `p:vers:${plugin2.rid}:0`);
  await screen(ctx, lines.filter(Boolean).join(`
`), kb);
}
async function handlePhoto(ctx) {
  const uid = ctx.from.id;
  const s = await getSession(uid);
  if (s?.state === "wiz")
    return wizPhoto(ctx, s.payload);
  if (s?.state === "shots") {
    const { plugin: plugin2, owner } = await accessible(ctx, s.payload.rid);
    if (!owner)
      throw new Stale;
    const check = checkPhoto(ctx.message.photo);
    if (!check.ok)
      return void await ctx.reply(`\u274C ${check.error}`);
    const r = await addScreenshot2(ctx.api, plugin2, check);
    if (r.kind === "error")
      return void await ctx.reply(`\u26A0\uFE0F ${r.message}`);
    await setSession(uid, "shots", s.payload);
    await ctx.reply(`\u2705 \u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E (${r.count}/${MAX_SCREENSHOTS})${r.published ? "" : " \u2014 \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u0432 \u043A\u0430\u043D\u0430\u043B\u0435 \u043F\u043E\u0441\u043B\u0435 \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u0438\u044F \u043F\u043B\u0430\u0433\u0438\u043D\u0430"}.`, { reply_markup: new import_grammy7.InlineKeyboard().text("\u0413\u043E\u0442\u043E\u0432\u043E", `p:shots:${plugin2.rid}`) });
    return;
  }
  await ctx.reply("\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u044B \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0432 \u043C\u0430\u0441\u0442\u0435\u0440\u0435 \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438 \u0438\u043B\u0438 \u0432 \u044D\u043A\u0440\u0430\u043D\u0435 \u043F\u043B\u0430\u0433\u0438\u043D\u0430 \u2192 \xAB\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u044B\xBB.", {
    reply_markup: new import_grammy7.InlineKeyboard().text("\u2302 \u041C\u0435\u043D\u044E", "m:home")
  });
}
async function handleText(ctx) {
  const uid = ctx.from.id;
  const text = ctx.message.text;
  const s = await getSession(uid);
  if (!s) {
    await ctx.reply("\u041D\u0435 \u043F\u043E\u043D\u044F\u043B. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043C\u0435\u043D\u044E:", { reply_markup: new import_grammy7.InlineKeyboard().text("\u2302 \u041C\u0435\u043D\u044E", "m:home") });
    return;
  }
  switch (s.state) {
    case "wiz":
      return wizText(ctx, s.payload, text);
    case "await_file":
      await ctx.reply("\u041F\u0440\u0438\u0448\u043B\u0438\u0442\u0435 \u0444\u0430\u0439\u043B <code>.inu.js</code> \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u043C \u0438\u043B\u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041E\u0442\u043C\u0435\u043D\u0430\xBB \u0432 \u043C\u0435\u043D\u044E.", { parse_mode: "HTML" });
      return;
    case "edit":
      return applyEdit(ctx, s.payload.field, s.payload.rid, text);
    default:
      return onAdminText(ctx, s, text);
  }
}
async function applyEdit(ctx, field, rid, text) {
  const { plugin: plugin2, owner } = await accessible(ctx, rid);
  if (!owner)
    throw new Stale;
  if (field === "repo") {
    await clearSession(ctx.from.id);
    return finishRepoChange(ctx, plugin2, text, false);
  }
  const err = async (m) => void await ctx.reply(`\u26A0\uFE0F ${m}
\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437 \u0438\u043B\u0438 \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043C\u0435\u043D\u044E.`);
  if (field === "description") {
    const v2 = validateDescription(text);
    if (!v2.ok)
      return err(v2.error);
    await updatePlugin(plugin2.id, { description: v2.value });
  } else if (field === "icon") {
    const v2 = validateIcon(text);
    if (!v2.ok)
      return err(v2.error);
    await updatePlugin(plugin2.id, { icon: v2.value });
  } else {
    const v2 = validateAuthor(text);
    if (!v2.ok)
      return err(v2.error);
    await updatePlugin(plugin2.id, { author: v2.value });
  }
  await clearSession(ctx.from.id);
  try {
    await refreshAfterEdit(ctx.api);
  } catch (e) {
    await ctx.reply(`\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E, \u043D\u043E \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u043D\u0435 \u043E\u0431\u043D\u043E\u0432\u0438\u043B\u0441\u044F: ${errText(e)}`);
  }
  await showPlugin(ctx, rid);
}

// src/bot.ts
var INSTALL_RE = /^install ([a-z0-9._-]{3,64}) (\S{1,64})$/;
function createBot() {
  const bot = new import_grammy8.Bot(config().botToken);
  bot.use(async (ctx, next) => {
    if (!await markUpdateProcessed(ctx.update.update_id))
      return;
    await next();
  });
  bot.on("inline_query", async (ctx) => {
    await ctx.answerInlineQuery([], { cache_time: 0, is_personal: true }).catch((e) => log("warn", "answerInlineQuery failed", { error: errText(e) }));
    const m = INSTALL_RE.exec(ctx.inlineQuery.query.trim());
    if (!m || ctx.inlineQuery.query.length > 256)
      return;
    try {
      await recordInstall(ctx.from.id, m[1], m[2]);
    } catch (e) {
      log("warn", "install not recorded", { error: errText(e) });
    }
  });
  bot.use(async (ctx, next) => {
    if (!ctx.from)
      return;
    const privateChat = ctx.chat?.type === "private";
    const fromButton = !!ctx.callbackQuery;
    if (!privateChat && !fromButton)
      return;
    if (privateChat) {
      const name = ctx.from.username ?? ctx.from.first_name ?? null;
      await touchUser(ctx.from.id, name).catch(() => {});
    }
    if (await isBanned(ctx.from.id)) {
      if (ctx.callbackQuery)
        await ctx.answerCallbackQuery({ text: "\u0412\u044B \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u044B", show_alert: true }).catch(() => {});
      else
        await ctx.reply("\u0412\u044B \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u044B.");
      return;
    }
    await next();
  });
  bot.command(["start", "menu"], async (ctx) => {
    await clearSession(ctx.from.id);
    if (ctx.message?.text?.startsWith("/start")) {
      await ctx.reply("\u041F\u0440\u0438\u0432\u0435\u0442! \u042F \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u044E \u043F\u043B\u0430\u0433\u0438\u043D\u044B \u0434\u043B\u044F Inugram \u0438 \u043F\u0443\u0431\u043B\u0438\u043A\u0443\u044E \u0438\u0445 \u0432 \u043A\u0430\u043D\u0430\u043B\u0435 " + `@${config().channelUsername}. \u0412\u0441\u0451 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u2014 \u043A\u043D\u043E\u043F\u043A\u0430\u043C\u0438 \u043D\u0438\u0436\u0435.`);
    }
    await showHome(ctx);
  });
  bot.command("cancel", async (ctx) => {
    await clearSession(ctx.from.id);
    await showHome(ctx);
  });
  bot.command("my", (ctx) => showMyPlugins(ctx, 0));
  bot.command("describe", async (ctx) => {
    await ctx.reply("\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043F\u043B\u0430\u0433\u0438\u043D \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u2192 \xAB\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435\xBB \u0438\u043B\u0438 \xAB\u0418\u043A\u043E\u043D\u043A\u0430\xBB.");
    await showMyPlugins(ctx, 0);
  });
  const adminOnly = (fn) => async (ctx) => {
    if (!isAdmin(ctx.from.id))
      return;
    await fn(ctx);
  };
  bot.command("ban", adminOnly((ctx) => {
    const id = Number(ctx.match);
    if (!Number.isSafeInteger(id) || id <= 0)
      return ctx.reply("\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435: /ban <user_id>");
    return askBan(ctx, id);
  }));
  bot.command("unban", adminOnly(async (ctx) => {
    const id = Number(ctx.match);
    if (!Number.isSafeInteger(id) || id <= 0)
      return ctx.reply("\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435: /unban <user_id>");
    await setBanned(id, false);
    return ctx.reply(`\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C ${id} \u0440\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D.`);
  }));
  bot.command("rebuild", adminOnly(async (ctx) => ctx.reply(await doRebuild(ctx) ?? "\u0413\u043E\u0442\u043E\u0432\u043E")));
  bot.command("backup", adminOnly((ctx) => doBackup(ctx)));
  bot.on("message:document", onDocument);
  bot.on("message:photo", handlePhoto);
  bot.on("message:text", handleText);
  bot.on("callback_query:data", async (ctx) => {
    let alert;
    try {
      alert = await handleCallback(ctx);
    } catch (e) {
      if (e instanceof Stale) {
        await ctx.answerCallbackQuery({ text: e.message, show_alert: true }).catch(() => {});
        await showHome(ctx).catch(() => {});
        return;
      }
      throw e;
    }
    await ctx.answerCallbackQuery(alert ? { text: alert, show_alert: true } : undefined).catch(() => {});
  });
  bot.catch(async (err) => {
    const ctx = err.ctx;
    if (err.error instanceof Stale && ctx.chat?.type === "private") {
      await ctx.reply(err.error.message).catch(() => {});
      return;
    }
    log("error", "update failed", { update: ctx.update.update_id, error: errText(err.error) });
    if (ctx.callbackQuery)
      await ctx.answerCallbackQuery({ text: "\u041E\u0448\u0438\u0431\u043A\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437", show_alert: true }).catch(() => {});
    else if (ctx.chat?.type === "private")
      await ctx.reply("\u0427\u0442\u043E-\u0442\u043E \u043F\u043E\u0448\u043B\u043E \u043D\u0435 \u0442\u0430\u043A, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.").catch(() => {});
  });
  return bot;
}

// src/entry/webhook.ts
var REQUIRED = ["BOT_TOKEN", "WEBHOOK_SECRET", "DATABASE_URL", "CHANNEL_ID"];
var handler;
var secret = "";
async function init() {
  if (handler)
    return handler;
  secret = config().webhookSecret;
  handler = import_grammy9.webhookCallback(createBot(), "std/http", { timeoutMilliseconds: 55000 });
  return handler;
}
var webhook_default = {
  async fetch(request) {
    try {
      if (request.method !== "POST") {
        const missing = REQUIRED.filter((k) => !process.env[k]);
        return Response.json({ ok: missing.length === 0, missing });
      }
      const handle = await init();
      if (request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
        return new Response("unauthorized", { status: 401 });
      }
      return await handle(request);
    } catch (e) {
      console.error(JSON.stringify({ level: "error", msg: "webhook crashed", error: e instanceof Error ? `${e.message}
${e.stack}` : String(e) }));
      return new Response("internal error", { status: 500 });
    }
  }
};
export {
  webhook_default as default
};
