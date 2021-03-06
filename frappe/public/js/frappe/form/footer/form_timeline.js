// Copyright (c) 2020, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt
import BaseTimeline from "./base_timeline";
import { get_version_timeline_content } from "./version_timeline_content_builder";

class FormTimeline extends BaseTimeline {
	make() {
		super.make();
		this.setup_document_email_link();
		this.setup_timeline_actions();
		this.render_timeline_items();
	}

	setup_timeline_actions() {
		this.add_action_button(__('New Email'), () => this.compose_mail());
		this.setup_new_event_button();
		this.setup_only_communications_switch();
	}

	setup_new_event_button() {
		if (this.frm.meta.allow_events_in_timeline) {
			let create_event = () => {
				const args = {
					doc: this.frm.doc,
					frm: this.frm,
					recipients: this.get_recipient(),
					txt: frappe.markdown(this.frm.comment_box.get_value())
				};
				return new frappe.views.InteractionComposer(args);
			};
			this.add_action_button(__('New Event'), create_event);
		}
	}

	setup_only_communications_switch() {
		let doc_info = this.doc_info || this.frm.get_docinfo();
		let has_communications = () => {
			let communications = doc_info.communications;
			let comments = doc_info.comments;
			return (communications || []).length || (comments || []).length;
		};

		if (has_communications()) {
			this.timeline_actions_wrapper
				.append(`
					<div class="custom-control custom-switch communication-switch">
						<input type="checkbox" class="custom-control-input" id="only-communication-switch">
						<label class="custom-control-label" for="only-communication-switch">
							${__('Show Only Communications')}
						</label>
					</div>
				`)
				.find('.custom-control-input')
				.change(e => {
					this.only_communication = e.target.checked;
					this.render_timeline_items();
				});
		}
	}

	setup_document_email_link() {
		let doc_info = this.doc_info || this.frm.get_docinfo();

		if (doc_info.document_email) {
			const link = `<a class="document-email-link">${doc_info.document_email}</a>`;
			const message = __("Send an email to {0} to link it here", [link.bold()]);

			this.document_email_link_wrapper = $(`
				<div class="document-email-link-container">
					<div class="timeline-dot"></div>
					<span>${message}</span>
				</div>
			`);
			this.timeline_wrapper.prepend(this.document_email_link_wrapper);

			this.document_email_link_wrapper
				.find('.document-email-link')
				.on("click", e => {
					let text = $(e.target).text();
					frappe.utils.copy_to_clipboard(text);
				});
		}
	}

	add_action_button(label, action) {
		let action_btn = $(`<button class="btn btn-xs btn-default action-btn">${label}</button>`);
		action_btn.click(action);
		this.timeline_actions_wrapper.append(action_btn);
		return action_btn;
	}

	prepare_timeline_contents() {
		this.timeline_items.push(...this.get_communication_timeline_contents());
		this.timeline_items.push(...this.get_comment_timeline_contents());
		if (!this.only_communication) {
			this.timeline_items.push(...this.get_view_timeline_contents());
			this.timeline_items.push(...this.get_energy_point_timeline_contents());
			this.timeline_items.push(...this.get_version_timeline_contents());
			this.timeline_items.push(...this.get_share_timeline_contents());
			this.timeline_items.push(...this.get_like_timeline_contents());
			this.timeline_items.push(...this.get_custom_timeline_contents());
			this.timeline_items.push(...this.get_assignment_timeline_contents());
			this.timeline_items.push(...this.get_attachment_timeline_contents());
			this.timeline_items.push(...this.get_milestone_timeline_contents());
		}
	}

	get_user_link(user) {
		const user_display_text = (frappe.user_info(user).fullname || '').bold();
		return frappe.utils.get_form_link('User', user, true, user_display_text);
	}

	get_view_timeline_contents() {
		let view_timeline_contents = [];
		(this.doc_info.views || []).forEach(view => {
			let view_content = `
				<a href="${frappe.utils.get_form_link('View Log', view.name)}">
					${__("{0} viewed", [this.get_user_link(view.owner)])}
				</a>
			`;
			view_timeline_contents.push({
				creation: view.creation,
				content: view_content,
			});
		});
		return view_timeline_contents;
	}

	get_communication_timeline_contents() {
		let communication_timeline_contents = [];
		(this.doc_info.communications|| []).forEach(communication => {
			communication_timeline_contents.push({
				icon: 'mail',
				icon_size: 'sm',
				creation: communication.creation,
				card: true,
				content: this.get_communication_timeline_content(communication),
			});
		});
		return communication_timeline_contents;
	}

	get_communication_timeline_content(doc) {
		doc.owner = doc.sender;
		doc.user_full_name = doc.sender_full_name;
		let communication_content =  $(frappe.render_template('timeline_message_box', { doc }));
		this.setup_reply(communication_content, doc);
		return communication_content;
	}

	get_comment_timeline_contents() {
		let comment_timeline_contents = [];
		(this.doc_info.comments || []).forEach(comment => {
			comment_timeline_contents.push({
				icon: 'small-message',
				creation: comment.creation,
				card: true,
				content: this.get_comment_timeline_content(comment),
			});
		});
		return comment_timeline_contents;
	}

	get_comment_timeline_content(doc) {
		const comment_content = $(frappe.render_template('timeline_message_box', { doc }));
		this.setup_comment_actions(comment_content, doc);
		return comment_content;
	}

	get_version_timeline_contents() {
		let version_timeline_contents = [];
		(this.doc_info.versions || []).forEach(version => {
			const contents = get_version_timeline_content(version, this.frm);
			contents.forEach((content) => {
				version_timeline_contents.push({
					creation: version.creation,
					content: content,
				});
			});
		});
		return version_timeline_contents;
	}

	get_share_timeline_contents() {
		let share_timeline_contents = [];
		(this.doc_info.share_logs || []).forEach(share_log => {
			share_timeline_contents.push({
				creation: share_log.creation,
				content: share_log.content,
			});
		});
		return share_timeline_contents;
	}

	get_assignment_timeline_contents() {
		let assignment_timeline_contents = [];
		(this.doc_info.assignment_logs || []).forEach(assignment_log => {
			assignment_timeline_contents.push({
				creation: assignment_log.creation,
				content: assignment_log.content,
			});
		});
		return assignment_timeline_contents;
	}

	get_attachment_timeline_contents() {
		let attachment_timeline_contents = [];
		(this.doc_info.attachment_logs || []).forEach(attachment_log => {
			let is_file_upload = attachment_log.comment_type == 'Attachment';
			attachment_timeline_contents.push({
				icon: is_file_upload ? 'upload' : 'delete',
				icon_size: 'sm',
				creation: attachment_log.creation,
				content: `${this.get_user_link(attachment_log.owner)} ${attachment_log.content}`,
			});
		});
		return attachment_timeline_contents;
	}

	get_milestone_timeline_contents() {
		let milestone_timeline_contents = [];
		(this.doc_info.milestones || []).forEach(milestone_log => {
			milestone_timeline_contents.push({
				icon: 'milestone',
				creation: milestone_log.creation,
				content: __('{0} changed {1} to {2}', [
					this.get_user_link(milestone_log.owner),
					frappe.meta.get_label(this.frm.doctype, milestone_log.track_field),
					milestone_log.value.bold()]),
			});
		});
		return milestone_timeline_contents;
	}

	get_like_timeline_contents() {
		let like_timeline_contents = [];
		(this.doc_info.like_logs || []).forEach(like_log => {
			like_timeline_contents.push({
				icon: 'heart',
				icon_size: 'sm',
				creation: like_log.creation,
				content: __('{0} Liked', [this.get_user_link(like_log.owner)]),
			});
		});
		return like_timeline_contents;
	}

	get_custom_timeline_contents() {
		let custom_timeline_contents = [];
		(this.doc_info.additional_timeline_content || []).forEach(custom_item => {
			custom_timeline_contents.push({
				icon: custom_item.icon,
				icon_size: 'sm',
				card: custom_item.show_card,
				creation: custom_item.creation,
				content: custom_item.content || frappe.render_template(custom_item.template, custom_item.template_data),
			});
		});
		return custom_timeline_contents;
	}

	get_energy_point_timeline_contents() {
		let energy_point_timeline_contents = [];
		(this.doc_info.energy_point_logs || []).forEach(log => {
			let timeline_badge = `
			<div class="timeline-badge ${log.points > 0 ? 'appreciation': 'criticism'} bold">
				${log.points}
			</div>`;

			energy_point_timeline_contents.push({
				timeline_badge: timeline_badge,
				creation: log.creation,
				content: frappe.energy_points.format_form_log(log)
			});
		});
		return energy_point_timeline_contents;
	}

	setup_reply(communication_box, communication_doc) {
		let actions = communication_box.find('.actions');
		let reply = $(`<a class="action-btn reply">${frappe.utils.icon('reply', 'md')}</a>`).click(() => {
			this.compose_mail(communication_doc);
		});
		let reply_all = $(`<a class="action-btn reply-all">${frappe.utils.icon('reply-all', 'md')}</a>`).click(() => {
			this.compose_mail(communication_doc, true);
		});
		actions.append(reply);
		actions.append(reply_all);
	}

	compose_mail(communication_doc=null, reply_all=false) {
		const args = {
			doc: this.frm.doc,
			frm: this.frm,
			recipients: this.get_recipient(),
			is_a_reply: Boolean(communication_doc),
			title: communication_doc ? __('Reply') : null,
			last_email: communication_doc
		};

		if (communication_doc && reply_all) {
			args.cc = communication_doc.cc;
			args.bcc = communication_doc.bcc;
		}

		if (this.frm.doctype === "Communication") {
			args.txt = "";
			args.last_email = this.frm.doc;
			args.recipients = this.frm.doc.sender;
			args.subject = __("Re: {0}", [this.frm.doc.subject]);
		} else {
			const comment_value = frappe.markdown(this.frm.comment_box.get_value());
			args.txt = strip_html(comment_value) ? comment_value : '';
		}

		new frappe.views.CommunicationComposer(args);
	}

	get_recipient() {
		if (this.frm.email_field) {
			return this.frm.doc[this.frm.email_field];
		} else {
			return this.frm.doc.email_id || this.frm.doc.email || "";
		}
	}

	setup_comment_actions(comment_wrapper, doc) {
		let edit_wrapper = $(`<div class="comment-edit-box">`).hide();
		let edit_box = this.make_editable(edit_wrapper);
		let content_wrapper = comment_wrapper.find('.content');

		let delete_button = $(`
			<button class="btn btn-link action-btn icon-btn">
				${frappe.utils.icon('close', 'sm')}
			</button>
		`).click(() => this.delete_comment(doc.name));

		let dismiss_button = $(`
			<button class="btn btn-link action-btn icon-btn">
				${__('Dismiss')}
			</button>
		`).click(() => edit_button.toggle_edit_mode());
		dismiss_button.hide();

		edit_box.set_value(doc.content);

		edit_box.on_submit = (value) => {
			content_wrapper.empty();
			content_wrapper.append(value);
			edit_button.prop("disabled", true);
			edit_box.quill.enable(false);

			doc.content = value;
			this.update_comment(doc.name, value)
				.then(edit_button.toggle_edit_mode)
				.finally(() => {
					edit_button.prop("disabled", false);
					edit_box.quill.enable(true);
				});
		};

		content_wrapper.after(edit_wrapper);

		let edit_button = $(`<button class="btn btn-link action-btn">${__("Edit")}</a>`).click(() => {
			edit_button.edit_mode ? edit_box.submit() : edit_button.toggle_edit_mode();
		});

		edit_button.toggle_edit_mode = () => {
			edit_button.edit_mode = !edit_button.edit_mode;
			edit_button.text(edit_button.edit_mode ? __('Save') : __('Edit'));
			delete_button.toggle(!edit_button.edit_mode);
			dismiss_button.toggle(edit_button.edit_mode);
			edit_wrapper.toggle(edit_button.edit_mode);
			content_wrapper.toggle(!edit_button.edit_mode);
		};

		comment_wrapper.find('.actions').append(edit_button);
		comment_wrapper.find('.actions').append(dismiss_button);
		comment_wrapper.find('.actions').append(delete_button);
	}

	make_editable(container) {
		return frappe.ui.form.make_control({
			parent: container,
			df: {
				fieldtype: 'Comment',
				fieldname: 'comment',
				label: 'Comment'
			},
			// mentions: this.get_names_for_mentions(),
			render_input: true,
			only_input: true,
			no_wrapper: true
		});
	}

	update_comment(name, content) {
		return frappe.xcall('frappe.desk.form.utils.update_comment', { name, content })
			.then(() => {
				frappe.utils.play_sound('click');
			});
	}

	get_last_email(from_recipient) {
		let last_email = null;
		let communications = this.frm.get_docinfo().communications || [];
		let email = this.get_recipient();
		// REDESIGN TODO: What is this? Check again
		(communications.sort((a, b) =>  a.creation > b.creation ? -1 : 1 )).forEach(c => {
			if (c.communication_type === 'Communication' && c.communication_medium === "Email") {
				if (from_recipient) {
					if (c.sender.indexOf(email)!==-1) {
						last_email = c;
						return false;
					}
				} else {
					last_email = c;
					return false;
				}
			}

		});

		return last_email;
	}

	delete_comment(comment_name) {
		frappe.confirm(__('Delete comment?'), () => {
			return frappe.xcall("frappe.client.delete", {
				doctype: "Comment",
				name: comment_name
			}).then(() => {
				frappe.utils.play_sound("delete");
			});
		});
	}
}

export default FormTimeline;