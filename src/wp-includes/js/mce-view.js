// Ensure the global `wp` object exists.
window.wp = window.wp || {};

(function($){
	var views = {},
		instances = {},
		media = wp.media,
		viewOptions = ['document', 'encodedText'];

	// Create the `wp.mce` object if necessary.
	wp.mce = wp.mce || {};

	/**
	 * wp.mce.View
	 * 
	 * A Backbone-like View constructor intended for use when rendering a TinyMCE View. The main difference is
	 * that the TinyMCE View is intended to be short-lived. Once the view is rendered, the View is destroyed rather than 
	 * being attached to the DOM and listening for either DOM event or Backbone events.
	 */
	wp.mce.View = function( options ) {
		options || (options = {});
		_.extend(this, _.pick(options, viewOptions));
		this.initialize.apply(this, arguments);
	};

	_.extend( wp.mce.View.prototype, {
		initialize: function() {},
		render: function() {}
	} );

	// take advantage of the Backbone extend method
	wp.mce.View.extend = Backbone.View.extend;

	/** 
	 * wp.mce.views
	 * 
	 * A set of utilities that simplifies adding custom UI within a TinyMCE editor.
	 * At its core, it serves as a series of converters, transforming text to a
	 * custom UI, and back again.
	 */
	wp.mce.views = {

		/**
		 * wp.mce.views.register( type, view )
		 *
		 * Registers a new TinyMCE view.
		 *
		 * @param type
		 * @param constructor 
		 *
		 */
		register: function( type, constructor ) {
			views[ type ] = constructor;
		},

		/**
		 * wp.mce.views.get( id )
		 *
		 * Returns a TinyMCE view constructor.
		 */
		get: function( type ) {
			return views[ type ];
		},

		/**
		 * wp.mce.views.unregister( type )
		 *
		 * Unregisters a TinyMCE view.
		 */
		unregister: function( type ) {
			delete views[ type ];
		},

		/**
		 * toViews( content )
		 * Scans a `content` string for each view's pattern, replacing any
		 * matches with wrapper elements, and creates a new instance for
		 * every match, which triggers the related data to be fetched.
		 *
		 */
		toViews: function( document, content ) {
			var pieces = [ { content: content } ],
				current;

			_.each( views, function( view, viewType ) {
				current = pieces.slice();
				pieces  = [];

				_.each( current, function( piece ) {
					var remaining = piece.content,
						result;

					// Ignore processed pieces, but retain their location.
					if ( piece.processed ) {
						pieces.push( piece );
						return;
					}

					// Iterate through the string progressively matching views
					// and slicing the string as we go.
					while ( remaining && (result = view.toView( remaining )) ) {
						// Any text before the match becomes an unprocessed piece.
						if ( result.index ) {
							pieces.push({ content: remaining.substring( 0, result.index ) });
						}

						// Add the processed piece for the match.
						pieces.push({
							content: wp.mce.views.toView( document, viewType, result.content, result.options ),
							processed: true
						});

						// Update the remaining content.
						remaining = remaining.slice( result.index + result.content.length );
					}

					// There are no additional matches. If any content remains,
					// add it as an unprocessed piece.
					if ( remaining ) {
						pieces.push({ content: remaining });
					}
				});
			});

			return _.pluck( pieces, 'content' ).join('');
		},

		/**
		 * Create a placeholder for a particular view type
		 *
		 * @param viewType
		 * @param content
		 *
		 */
		toView: function( document, viewType, text, options ) {
			var view = wp.mce.views.get( viewType ),
				encodedText = window.encodeURIComponent( text ),
				instance, viewOptions;


			if ( ! view ) {
				return text;
			}

			if ( ! wp.mce.views.getInstance() ) {
				viewOptions = options;
				viewOptions.document = document;
				viewOptions.encodedText = encodedText;
				instance = new view.View( viewOptions );
				instances[ encodedText ] = instance;
			}

			return wp.html.string({
				tag: 'div',

				attrs: {
					'class': 'wpview-wrap wpview-type-' + viewType,
					'data-wpview-text': encodedText,
					'contenteditable': 'false'
				},

				content: '\u00a0'
			});
		},

		getInstance: function( encodedText ) {
			return instances[ encodedText ];
		},

		/** render( scope )
		 * Renders any view instances inside a DOM node `scope`.
		 *
		 * View instances are detected by the presence of wrapper elements.
		 * To generate wrapper elements, pass your content through
		 * `wp.mce.view.toViews( content )`.
		 */
		render: function() {
			_.each( instances, function( instance ) {
				instance.render();
			} );
		},

		/**
		 * Select a view.
		 *
		 * Accepts a MCE view wrapper `node` (i.e. a node with the
		 * `wpview-wrap` class).
		 */
		select: function( node ) {
			var $node = $(node),
				$clipboard,
				text;

			// Bail if node is already selected.
			if ( $node.hasClass('selected') ) {
				return;
			}

			$node.addClass('selected');

			text = window.decodeURIComponent( $node.data('wpview-text') );

			$clipboard = $( '<div />' )
				.addClass( 'wpview-clipboard' )
				.prop( 'contenteditable', 'true' )
				.data( 'mce-bogus', '1' )
				.text( text );

			$node.prepend( $clipboard );

		},

		// ### Deselect a view.
		//
		// Accepts a MCE view wrapper `node` (i.e. a node with the
		// `wpview-wrap` class).
		deselect: function( node ) {
			var $node = $(node);

			// Bail if node is already selected.
			if ( ! $node.hasClass('selected') ) {
				return;
			}

			$node.removeClass('selected');
			$node.find( '.wpview-clipboard' ).remove();
		}
	};

	wp.mce.gallery = {
		shortcode: 'gallery',
		toView:  function( content ) {
			var match = wp.shortcode.next( this.shortcode, content );

			if ( ! match ) {
				return;
			}

			return {
				index:   match.index,
				content: match.content,
				options: {
					shortcode: match.shortcode
				}
			};
		},
		View: wp.mce.View.extend({
			className: 'editor-gallery',
			template:  media.template('editor-gallery'),

			// The fallback post ID to use as a parent for galleries that don't
			// specify the `ids` or `include` parameters.
			//
			// Uses the hidden input on the edit posts page by default.
			postID: $('#post_ID').val(),

			initialize: function( options ) {
				this.shortcode = options.shortcode;
				this.fetch();
			},

			fetch: function() {
				this.attachments = wp.media.gallery.attachments( this.shortcode, this.postID );
				this.attachments.more().done( _.bind( this.render, this ) );
			},

			render: function() {
				var attrs = this.shortcode.attrs.named,
					options,
					html;

				if ( ! this.attachments.length ) {
					return;
				}

				options = {
					attachments: this.attachments.toJSON(),
					columns: attrs.columns ? parseInt( attrs.columns, 10 ) : 3
				};

				html = this.template( options );

				$( this.document ).find( '[data-wpview-text="' + this.encodedText + '"]' ).html( html );
			}
		})
	};
	wp.mce.views.register( 'gallery', wp.mce.gallery );
}(jQuery));
